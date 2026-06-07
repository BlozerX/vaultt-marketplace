"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send, MoreVertical } from "lucide-react";
import { API_URL, formatINR } from "@/lib/api";
import Avatar from "@/components/Avatar";
import ImageWithFallback from "@/components/ImageWithFallback";

export default function Inbox() {
  const { user, token, updateUser } = useAuth();
  const router = useRouter();

  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [renegotiatePrice, setRenegotiatePrice] = useState("");
  const [sending, setSending] = useState(false);
  
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    // Sync fresh user data to catch block/unblock events from other devices or users
    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data && data._id) {
          updateUser({ blockedUsers: data.blockedUsers, blockedBy: data.blockedBy });
        }
      })
      .catch(console.error);

    // Fetch both sent and received offers
    Promise.all([
      fetch(`${API_URL}/api/offers/mine`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/offers/received`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ])
    .then(([sent, received]) => {
      const all = [...(Array.isArray(sent) ? sent : []), ...(Array.isArray(received) ? received : [])];
      // Sort by latest message or creation
      all.sort((a, b) => {
        const dateA = a.messages && a.messages.length > 0 ? a.messages[a.messages.length - 1].createdAt : a.createdAt;
        const dateB = b.messages && b.messages.length > 0 ? b.messages[b.messages.length - 1].createdAt : b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      setOffers(all);
    })
    .catch(() => setError("Failed to load inbox"))
    .finally(() => setLoading(false));
  }, [token, router]);

  useEffect(() => {
    if (selectedOffer) {
      fetch(`${API_URL}/api/offers/${selectedOffer._id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data && data._id) {
            setMessages(data.messages || []);
          }
        });
    }
  }, [selectedOffer, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedOffer || !token) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/offers/${selectedOffer._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newMessage }),
      });
      const data = await res.json();
      if (res.ok) {
        // The backend returns a single message object, we need to append it
        setMessages(prev => [...prev, data]);
        setNewMessage("");
        
        // Update local offer preview
        setOffers(prev => prev.map(o => 
          o._id === selectedOffer._id 
            ? { ...o, messages: [...(o.messages || []), data], updatedAt: new Date().toISOString() }
            : o
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleRenegotiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !renegotiatePrice || !selectedOffer || !token) return;

    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/offers/${selectedOffer._id}/renegotiate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage, offerPrice: Number(renegotiatePrice) }),
      });
      const data = await res.json();
      if (res.ok) {
        // Fetch fresh offer data to get fully populated sender fields
        const freshRes = await fetch(`${API_URL}/api/offers/${selectedOffer._id}`, { headers: { Authorization: `Bearer ${token}` } });
        const freshData = await freshRes.json();
        
        setSelectedOffer(freshData);
        setMessages(freshData.messages || []);
        setNewMessage("");
        setRenegotiatePrice("");
        
        setOffers(prev => prev.map(o => 
          o._id === freshData._id ? freshData : o
        ));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedOffer || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/offers/${selectedOffer._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedOffer((prev: any) => ({ ...prev, status: updated.status }));
        setOffers(prev => prev.map(o => o._id === updated._id ? updated : o));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteChat = async () => {
    if (!selectedOffer || !token) return;
    try {
      await fetch(`${API_URL}/api/offers/${selectedOffer._id}/delete`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(prev => prev.filter(o => o._id !== selectedOffer._id));
      setSelectedOffer(null);
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedOffer || !token) return;
    const isBuyer = selectedOffer.buyerId?._id === user?._id || selectedOffer.buyerId === user?._id;
    const otherPartyId = isBuyer 
      ? selectedOffer.listingId?.sellerId?._id || selectedOffer.listingId?.sellerId 
      : selectedOffer.buyerId?._id || selectedOffer.buyerId;
    if (!otherPartyId) return;
    
    try {
      await fetch(`${API_URL}/api/auth/block/${otherPartyId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      // Fetch fresh user data to update context
      const meRes = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const meData = await meRes.json();
      updateUser({ blockedUsers: meData.blockedUsers, blockedBy: meData.blockedBy });
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedOffer || !token) return;
    const isBuyer = selectedOffer.buyerId?._id === user?._id || selectedOffer.buyerId === user?._id;
    const otherPartyId = isBuyer 
      ? selectedOffer.listingId?.sellerId?._id || selectedOffer.listingId?.sellerId 
      : selectedOffer.buyerId?._id || selectedOffer.buyerId;
    if (!otherPartyId) return;
    
    try {
      await fetch(`${API_URL}/api/auth/unblock/${otherPartyId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      // Fetch fresh user data to update context
      const meRes = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const meData = await meRes.json();
      updateUser({ blockedUsers: meData.blockedUsers, blockedBy: meData.blockedBy });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer || !token || !reportReason) return;
    try {
      const otherPartyId = selectedOffer.buyerId?._id === user?._id || selectedOffer.buyerId === user?._id
        ? selectedOffer.listingId?.sellerId?._id || selectedOffer.listingId?.sellerId
        : selectedOffer.buyerId?._id || selectedOffer.buyerId;

      await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reportedUserId: otherPartyId,
          reason: reportReason,
          description: `Reported from chat regarding offer ${selectedOffer._id}`
        })
      });
      setShowReport(false);
      setShowMenu(false);
      alert("Report submitted successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) { return null; }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 w-full h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-tighter">Inbox</h1>
        <p className="text-sm font-mono text-neutral-500 mt-1">Manage your offers and messages.</p>
      </div>

      <div className="flex flex-1 border border-neutral-200 overflow-hidden bg-white min-h-[500px]">
        {/* Left Sidebar: Conversations List */}
        <div className={`w-full md:w-80 border-r border-neutral-200 flex flex-col ${selectedOffer ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-neutral-200 bg-neutral-50">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Conversations</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-xs font-mono text-neutral-400">LOADING...</div>
            ) : offers.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center h-full text-neutral-400">
                <MessageSquare size={32} className="mb-3 opacity-20" />
                <p className="text-xs font-mono uppercase">No messages yet</p>
              </div>
            ) : (
              offers.map((offer) => {
                const isBuyer = offer.buyerId._id === user?._id || offer.buyerId === user?._id;
                const otherParty = isBuyer 
                  ? offer.listingId?.sellerId 
                  : offer.buyerId;
                
                const otherPartyName = otherParty?.name || "User";
                let lastMessageText = offer.messages && offer.messages.length > 0 
                  ? offer.messages[offer.messages.length - 1].text 
                  : `Offer: ${formatINR(offer.offerPrice)}`;
                  
                if (lastMessageText.startsWith('[OFFER: ')) {
                  const parts = lastMessageText.split('] ');
                  lastMessageText = parts.length > 1 ? parts.slice(1).join('] ') : 'Sent an offer';
                }
                  
                const isUnread = false;

                return (
                  <button
                    key={offer._id}
                    onClick={() => setSelectedOffer(offer)}
                    className={`w-full text-left p-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors flex gap-3 ${selectedOffer?._id === offer._id ? 'bg-neutral-100 border-l-4 border-l-black' : 'border-l-4 border-l-transparent'}`}
                  >
                    <Avatar src={otherParty?.avatar} name={otherPartyName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm truncate pr-2 ${isUnread ? 'font-bold' : 'font-medium'}`}>
                          {otherPartyName}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 whitespace-nowrap">
                          {new Date(offer.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 truncate mb-1">
                        {offer.listingId?.title || "Listing"}
                      </p>
                      <p className={`text-xs truncate ${isUnread ? 'text-black font-medium' : 'text-neutral-500'}`}>
                        {lastMessageText}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Area: Chat Window */}
        <div className={`flex-1 flex flex-col bg-[#FCFCFC] ${!selectedOffer ? 'hidden md:flex' : 'flex'}`}>
          {!selectedOffer ? (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-mono uppercase tracking-widest">Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedOffer(null)} className="md:hidden text-neutral-500 mr-2">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="w-10 h-10 bg-neutral-100 flex-shrink-0">
                    <ImageWithFallback 
                      src={selectedOffer.listingId?.imageUrls?.[0] || selectedOffer.listingId?.imageUrl || ""} 
                      alt="item" 
                      className="w-full h-full object-cover" 
                      category={selectedOffer.listingId?.category}
                    />
                  </div>
                  <div>
                    <Link href={`/listings/${selectedOffer.listingId?._id}`} className="font-bold text-sm hover:underline">
                      {selectedOffer.listingId?.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 ${
                        selectedOffer.status === 'accepted' ? 'text-emerald-700 bg-emerald-50' :
                        selectedOffer.status === 'rejected' ? 'text-red-700 bg-red-50' :
                        'text-amber-700 bg-amber-50'
                      }`}>
                        {selectedOffer.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 relative">
                  {/* Seller Actions */}
                  {(selectedOffer.buyerId?._id !== user?._id && selectedOffer.buyerId !== user?._id && selectedOffer.buyerId !== user?.id) && selectedOffer.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStatusChange('accepted')}
                        className="bg-black text-white text-[10px] font-bold uppercase px-3 py-1.5 hover:bg-neutral-800"
                      >
                        Accept
                      </button>
                      <button 
                        onClick={() => handleStatusChange('rejected')}
                        className="border border-neutral-300 text-neutral-600 text-[10px] font-bold uppercase px-3 py-1.5 hover:bg-neutral-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  <button onClick={() => setShowMenu(!showMenu)} className="text-neutral-400 hover:text-black">
                    <MoreVertical size={20} />
                  </button>

                  {showMenu && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-neutral-200 shadow-xl z-10 flex flex-col">
                      <button onClick={handleDeleteChat} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 border-b border-neutral-100">Delete Chat</button>
                      {(() => {
                        const isBuyerParty = selectedOffer.buyerId?._id === user?._id || selectedOffer.buyerId === user?._id || selectedOffer.buyerId === user?.id;
                        const otherPartyId = isBuyerParty 
                          ? selectedOffer.listingId?.sellerId?._id || selectedOffer.listingId?.sellerId 
                          : selectedOffer.buyerId?._id || selectedOffer.buyerId;
                        const iBlockedThem = user?.blockedUsers?.includes(otherPartyId);
                        
                        if (!iBlockedThem) {
                          return (
                            <button onClick={handleBlockUser} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 border-b border-neutral-100 text-amber-700">Block User</button>
                          );
                        }
                        return null;
                      })()}
                      <button onClick={() => { setShowReport(true); setShowMenu(false); }} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-neutral-50 text-red-700">Report User</button>
                    </div>
                  )}
                </div>
              </div>

              {showReport && (
                <div className="absolute inset-0 bg-white z-20 p-8 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest">Report User</h3>
                    <button onClick={() => setShowReport(false)} className="text-neutral-400 hover:text-black">
                      <ArrowLeft size={20} />
                    </button>
                  </div>
                  <form onSubmit={handleReportSubmit} className="flex flex-col gap-4 max-w-sm">
                    <p className="text-xs text-neutral-500 mb-4">Select a reason for reporting this user. Our moderation team will review this conversation.</p>
                    <select
                      required
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="border border-neutral-300 p-3 text-sm font-mono focus:outline-none focus:border-black"
                    >
                      <option value="">Select a reason...</option>
                      <option value="spam">Spam or Unsolicited Commercial</option>
                      <option value="inappropriate">Inappropriate Language/Behavior</option>
                      <option value="scam">Suspected Scam</option>
                      <option value="other">Other</option>
                    </select>
                    <button type="submit" className="bg-red-700 text-white font-bold uppercase tracking-widest text-xs py-3 mt-4 hover:bg-red-800">
                      Submit Report
                    </button>
                  </form>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg: any, idx: number) => {
                  const isMe = msg.senderId?._id === user?._id || msg.senderId === user?._id || msg.senderId === user?.id;
                  const isOffer = msg.text.startsWith('[OFFER: ');
                  
                  let offerPrice = '';
                  let messageText = msg.text;
                  
                  if (isOffer) {
                    const parts = msg.text.split('] ');
                    const pricePart = parts[0].replace('[OFFER: ', '');
                    offerPrice = pricePart;
                    messageText = parts.length > 1 ? parts.slice(1).join('] ') : '';
                  }

                  if (isOffer) {
                    return (
                      <div key={idx} className={`flex flex-col max-w-[85%] w-full my-4 ${isMe ? 'self-end items-end ml-auto' : 'self-start items-start mr-auto'}`}>
                        <div className="bg-neutral-50 border border-neutral-200 w-full p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
                            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                              {isMe ? 'You sent an offer' : 'Received an offer'}
                            </span>
                            <span className="text-lg font-bold font-mono">{formatINR(Number(offerPrice))}</span>
                          </div>
                          {messageText && (
                            <p className="text-sm text-neutral-800 italic">"{messageText}"</p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end ml-auto' : 'self-start items-start mr-auto'}`}>
                      <div className={`px-4 py-2.5 text-sm ${isMe ? 'bg-black text-white' : 'bg-white border border-neutral-200 text-black'}`}>
                        {messageText}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-neutral-200">
                {(() => {
                  const isBuyerParty = selectedOffer.buyerId?._id === user?._id || selectedOffer.buyerId === user?._id || selectedOffer.buyerId === user?.id;
                  const otherPartyId = isBuyerParty 
                    ? selectedOffer.listingId?.sellerId?._id || selectedOffer.listingId?.sellerId 
                    : selectedOffer.buyerId?._id || selectedOffer.buyerId;
                  
                  const iBlockedThem = user?.blockedUsers?.includes(otherPartyId);
                  const theyBlockedMe = user?.blockedBy?.includes(otherPartyId);
                  
                  if (iBlockedThem) {
                    return (
                      <div className="flex flex-col items-center justify-center p-4 gap-2 border border-neutral-200 bg-neutral-50">
                        <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">You blocked this user</span>
                        <button onClick={handleUnblockUser} className="text-xs font-mono underline text-black hover:text-neutral-500 transition-colors">Unblock</button>
                      </div>
                    );
                  }
                  
                  if (theyBlockedMe || selectedOffer.deletedBy?.length > 0) {
                    return (
                      <div className="flex justify-center p-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-red-700">This conversation has been closed.</span>
                      </div>
                    );
                  }

                  const isBuyer = isBuyerParty;
                  
                  if (isBuyer && selectedOffer.status !== 'accepted') {
                    if (selectedOffer.status === 'pending') {
                      return (
                        <div className="flex justify-center p-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Waiting for seller's response...</span>
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col border border-neutral-300">
                        <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-300 flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                            Offer Rejected - Renegotiate
                          </span>
                        </div>
                        <form onSubmit={handleRenegotiate} className="flex gap-2 p-2">
                          <input
                            type="number"
                            required
                            value={renegotiatePrice}
                            onChange={(e) => setRenegotiatePrice(e.target.value)}
                            placeholder="New Price (₹)"
                            className="w-32 border border-neutral-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-black"
                            disabled={sending}
                          />
                          <input
                            type="text"
                            required
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Add a message..."
                            className="flex-1 border border-neutral-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-black"
                            disabled={sending}
                          />
                          <button
                            type="submit"
                            disabled={sending || !newMessage.trim() || !renegotiatePrice}
                            className="bg-black text-white px-4 py-2 flex items-center justify-center disabled:opacity-50 hover:bg-neutral-800 transition-colors text-xs font-bold uppercase tracking-widest"
                          >
                            Send
                          </button>
                        </form>
                      </div>
                    );
                  }

                  return (
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isBuyer ? "Type a message..." : "Type a message to the buyer..."}
                        className="flex-1 border border-neutral-300 px-4 py-2 text-sm font-mono focus:outline-none focus:border-black"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="bg-black text-white px-4 py-2 flex items-center justify-center disabled:opacity-50 hover:bg-neutral-800 transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
