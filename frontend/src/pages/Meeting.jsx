import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import io from "socket.io-client";

const UPLOADED_FILE_URL = "/mnt/data/Home.jsx";
const ICE_CONFIG = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER ?? "http://localhost:5000";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// Motion variants
const containerVariants = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.06 } } };
const cardVariants = { hidden: { opacity: 0, scale: 0.98 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.18 } }, hover: { scale: 1.03 } };

export default function Meeting({ roomId: propRoomId }) {
  const [userName, setUserName] = useState("Guest");
  const [isMuted, setIsMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [peers, setPeers] = useState({});
  const [messages, setMessages] = useState([]);
  const [chatValue, setChatValue] = useState("");
  const [participants, setParticipants] = useState([]);
  const [noCamera, setNoCamera] = useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [transcripts, setTranscripts] = React.useState([]); // {senderId, senderName, text, ts}
  const recognitionRef = React.useRef(null);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const pcsRef = useRef({});
  const mediaRecorderRef = useRef(null);
  const recordedBlobsRef = useRef([]);

  // New refs for transcription recorder/stream
  const transcribeRecorderRef = useRef(null);
  const transcribeChunksRef = useRef([]);
  const transcribeStreamRef = useRef(null);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUserName("Guest");
      return;
    }

    fetch(`${API_BASE}/api/user/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data?.user?.name) {
          setUserName(data.user.name);
        }
      })
      .catch(() => {
        setUserName("Guest");
      });
  }, []);

  const initialRoomId = React.useMemo(() => {
    return propRoomId
      || new URLSearchParams(window.location.search).get("room")
      || Math.random().toString(36).slice(2, 9);
  }, [propRoomId]);
  const roomIdRef = React.useRef(initialRoomId);
  const roomId = roomIdRef.current;
  React.useEffect(() => {
    const current = roomIdRef.current;
    const params = new URLSearchParams(window.location.search);
    if (params.get("room") !== current) {
      params.set("room", current);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  // Robust getLocalStream (audio fallback when no camera)
  async function getLocalStream(preferredDeviceId = null) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      const hasCamera = videoInputs.length > 0;
      setNoCamera(!hasCamera);

      if (hasCamera) {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      // fallback audio-only
      return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch (err) {
      console.error("getLocalStream error", err);
      // show a helpful UI message
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        // show toast or set state to show UI asking user to allow devices
        // example: showToast("Please allow camera/microphone access in your browser.");
        alert("Camera/microphone permission denied. Please allow access in the browser address bar and reload.");
      } else if (err.name === "NotFoundError") {
        alert("No camera found. The app will use audio only (if available).");
      } else {
        alert("Unable to access media devices: " + err.message);
      }
      return null;
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${API_BASE}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setUserName(data.user?.name || ""))
        .catch(() => {});
    }

    const start = async () => {
      const stream = await getLocalStream();
      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      }

      const token = localStorage.getItem("token") || "";
      socketRef.current = io(SIGNALING_SERVER, { transports: ["websocket"], auth: { token } });

      socketRef.current.on("connect", () => socketRef.current.emit("join-room", { meetingId: roomId }));

      socketRef.current.on("all-users", async ({ users }) => {
        setParticipants(users.map((id) => ({ socketId: id })));
        for (const remoteId of users) await createPeerConnectionAndOffer(remoteId);
      });

      socketRef.current.on("offer", async ({ sdp, caller }) => await handleIncomingOffer(caller, sdp));
      socketRef.current.on("answer", async ({ sdp, responder }) => { const pc = pcsRef.current[responder]; if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp)); });
      socketRef.current.on("ice-candidate", async ({ candidate, from }) => { const pc = pcsRef.current[from]; if (pc && candidate) try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.warn(e); } });

      socketRef.current.on("receive-group-message", (msg) => setMessages((m) => [...m, msg]));
      socketRef.current.on("user-joined", ({ socketId, userId }) => { setParticipants((list) => [...list, { socketId, name: userId }]); createPeerConnectionAndOffer(socketId); });
      socketRef.current.on("user-left", ({ socketId }) => cleanupPeer(socketId));

      // listen for transcript updates from server
      socketRef.current.on("transcript-update", (payload) => {
        // payload: { transcriptId, meetingId, text, fullText, segments, isFinal }
        if (!payload) return;
        if (payload.meetingId && payload.meetingId !== roomId) return;
        const text = payload.text || payload.fullText || "";
        if (!text) return;
        const entry = {
          senderId: payload.transcriptId || "server",
          senderName: payload.senderName || "Transcript",
          text,
          ts: Date.now(),
          isFinal: !!payload.isFinal
        };
        setTranscripts((t) => [...t, entry]);
      });
    };

    start();

    return () => {
      for (const id in pcsRef.current) { pcsRef.current[id].close(); delete pcsRef.current[id]; }
      if (socketRef.current) socketRef.current.disconnect();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
      // cleanup any transcription recorder/stream
      if (transcribeRecorderRef.current && transcribeRecorderRef.current.state !== "inactive") {
        try { transcribeRecorderRef.current.stop(); } catch (e) {}
      }
      if (transcribeStreamRef.current) {
        try { transcribeStreamRef.current.getTracks().forEach((t) => t.stop()); } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPeerConnectionAndOffer(remoteId) {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcsRef.current[remoteId] = pc;

    const localStream = localStreamRef.current;
    if (localStream) for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => { event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t)); setPeers((p) => ({ ...p, [remoteId]: { stream: remoteStream, name: "Participant" } })); };

    pc.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit("ice-candidate", { target: remoteId, candidate: e.candidate }); };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit("offer", { target: remoteId, sdp: pc.localDescription });
  }

  async function handleIncomingOffer(from, sdp) {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcsRef.current[from] = pc;

    const localStream = localStreamRef.current;
    if (localStream) for (const track of localStream.getTracks()) pc.addTrack(track, localStream);

    const remoteStream = new MediaStream();
    pc.ontrack = (event) => { event.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t)); setPeers((p) => ({ ...p, [from]: { stream: remoteStream, name: "Participant" } })); };

    pc.onicecandidate = (e) => { if (e.candidate) socketRef.current.emit("ice-candidate", { target: from, candidate: e.candidate }); };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current.emit("answer", { target: from, sdp: pc.localDescription });
  }

  function cleanupPeer(socketId) {
    const pc = pcsRef.current[socketId]; if (pc) { pc.close(); delete pcsRef.current[socketId]; }
    setPeers((p) => { const np = { ...p }; delete np[socketId]; return np; });
    setParticipants((list) => list.filter((x) => x.socketId !== socketId));
  }

  function toggleMute() { const stream = localStreamRef.current; if (!stream) return; stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled)); setIsMuted((m) => !m); }
  function toggleVideo() { const stream = localStreamRef.current; if (!stream) return; const videoTracks = stream.getVideoTracks(); if (videoTracks.length === 0) { setVideoOn(false); setNoCamera(true); return; } videoTracks.forEach((t) => (t.enabled = !t.enabled)); setVideoOn((v) => !v); }

  async function endCall() {
    // close all peer connections and stop local tracks then navigate away
    for (const id in pcsRef.current) { pcsRef.current[id].close(); delete pcsRef.current[id]; }
    if (socketRef.current) socketRef.current.emit("leave-room", { meetingId: roomId });
    if (socketRef.current) socketRef.current.disconnect();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    // optionally redirect to home
    window.location.href = "/";
  }

  async function toggleScreenShare() {
    if (!screenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        for (const id in pcsRef.current) {
          const pc = pcsRef.current[id];
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;
        screenTrack.onended = async () => {
          const camStream = await getLocalStream();
          const camTrack = camStream?.getVideoTracks()[0];
          if (camTrack) {
            for (const id in pcsRef.current) {
              const pc = pcsRef.current[id];
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
              if (sender) sender.replaceTrack(camTrack);
            }
            localStreamRef.current = camStream;
            if (localVideoRef.current) localVideoRef.current.srcObject = camStream;
          }
          setScreenSharing(false);
        };
        setScreenSharing(true);
      } catch (e) { console.warn("screen share failed", e); }
    } else {
      const stream = localVideoRef.current?.srcObject; stream?.getTracks().forEach((t) => t.stop());
    }
  }

  function startRecording() { const stream = localStreamRef.current; if (!stream) return; recordedBlobsRef.current = []; try { const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" }); mediaRecorderRef.current = mr; mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedBlobsRef.current.push(e.data); }; mr.onstop = () => { const blob = new Blob(recordedBlobsRef.current, { type: "video/webm" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.style.display = "none"; a.href = url; a.download = `recording_${roomId}.webm`; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000); }; mr.start(); setRecording(true); } catch (e) { console.error("MediaRecorder error", e); } }
  function stopRecording() { if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") { mediaRecorderRef.current.stop(); setRecording(false); } }

  // Transcription: upload chunk to backend
  async function uploadAudioBlob(blob, isFinal = false) {
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      if (blob) fd.append("audio", blob, `chunk_${Date.now()}.webm`);
      fd.append("meetingId", roomId);
      if (isFinal) fd.append("isFinal", "true");

      const res = await fetch(`${API_BASE}/api/transcribe/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      // server will also emit via socket; we don't rely on response, but we swallow possible returned transcript
      const data = await res.json().catch(() => ({}));
      if (data?.transcript?.fullText) {
        const entry = {
          senderId: data.transcript._id || "server",
          senderName: "Transcript",
          text: data.transcript.fullText,
          ts: Date.now(),
          isFinal: !!data.transcript.isFinal
        };
        setTranscripts((t) => [...t, entry]);
      }
    } catch (err) {
      console.error("uploadAudioBlob error", err);
    }
  }

  // Start transcription (audio-only MediaRecorder separate from video recorder)
  async function startTranscription() {
    if (isTranscribing) return;
    try {
      // request audio-only stream to avoid disturbing video tracks
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      transcribeStreamRef.current = stream;

      // create MediaRecorder for audio
      const options = { mimeType: "audio/webm;codecs=opus" };
      const mr = new MediaRecorder(stream, options);
      transcribeRecorderRef.current = mr;
      transcribeChunksRef.current = [];

      mr.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return;
        // accumulate chunk locally (optional)
        transcribeChunksRef.current.push(e.data);
        // send each chunk for near-live transcription
        await uploadAudioBlob(e.data, false);
      };

      mr.onstop = async () => {
        // when stopping, send final assembled blob if there are leftover chunks
        try {
          if (transcribeChunksRef.current.length) {
            const finalBlob = new Blob(transcribeChunksRef.current, { type: "audio/webm" });
            await uploadAudioBlob(finalBlob, true);
          } else {
            // still notify server stream ended (no audio in final)
            await uploadAudioBlob(null, true);
          }
        } catch (e) {
          console.error("final upload error", e);
        } finally {
          // stop tracks
          try { transcribeStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) {}
          transcribeStreamRef.current = null;
          transcribeChunksRef.current = [];
          transcribeRecorderRef.current = null;
        }
      };

      // start with a timeslice so ondataavailable fires periodically (3s)
      mr.start(3000);
      setIsTranscribing(true);
    } catch (err) {
      console.error("startTranscription error", err);
      alert("Unable to start transcription: " + (err.message || err));
    }
  }

  async function stopTranscription() {
    if (!isTranscribing) return;
    try {
      if (transcribeRecorderRef.current && transcribeRecorderRef.current.state !== "inactive") {
        transcribeRecorderRef.current.stop();
      } else {
        // still mark final on server if recorder not active
        await uploadAudioBlob(null, true);
      }
    } catch (e) {
      console.error("stopTranscription error", e);
    } finally {
      setIsTranscribing(false);
    }
  }

  function sendMessage() { if (!chatValue.trim()) return; const msg = { from: userName, text: chatValue, time: new Date().toISOString() }; socketRef.current.emit("send-group-message", { meetingId: roomId, message: msg }); setMessages((m) => [...m, msg]); setChatValue(""); }

  function renderRemoteVideos() {
    // show primary large video (first peer) and smaller thumbnails
    const entries = Object.entries(peers);
    const primary = entries.length ? entries[0] : null;
    return (
      <>
        <div className="col-span-1 md:col-span-2 bg-black rounded overflow-hidden flex items-center justify-center">
          {primary ? (
            <video autoPlay playsInline ref={(el) => el && (el.srcObject = primary[1].stream)} className="w-full h-full object-contain" />
          ) : (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {/* thumbnails */}
          <div className="bg-black rounded overflow-hidden">
            <video ref={(el) => el && (el.srcObject = localStreamRef.current)} autoPlay muted playsInline className="w-full h-28 object-cover" />
            <div className="p-1 text-xs text-white">You</div>
          </div>
          {entries.slice(0, 5).map(([id, p]) => (
            <div key={id} className="bg-black rounded overflow-hidden">
              <video autoPlay playsInline ref={(el) => el && (el.srcObject = p.stream)} className="w-full h-28 object-cover" />
              <div className="p-1 text-xs text-white">{p.name || 'Participant'}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // helper to render transcript as a single block of text
  const transcriptText = transcripts.map((t) => `${new Date(t.ts).toLocaleTimeString()} • ${t.senderName || "Transcript"}: ${t.text}`).join("\n");

  return (
    <motion.div className="relative h-screen bg-slate-900 text-white" variants={containerVariants} initial="hidden" animate="visible">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-800/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="font-semibold text-lg">Room: {roomId}</div>
            <div className="text-sm text-gray-300">{userName || 'Guest'}</div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="text-sm cursor-pointer px-3 py-1 bg-slate-700/40 rounded">Copy Invite</button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <motion.section className="col-span-1 md:col-span-1 bg-slate-800/40 rounded p-2 flex flex-col" variants={cardVariants}>
              <div className="flex-1 overflow-hidden rounded">
                {renderRemoteVideos()}
              </div>
            </motion.section>

            {/* Right column: chat & participants */}
            <motion.aside className="col-span-1 flex flex-col gap-4" variants={cardVariants}>
              <div className="p-3 bg-slate-800/40 rounded flex-1 overflow-auto">
                <div className="text-sm font-semibold mb-2">Chat</div>
                <div className="flex-1 space-y-2" style={{ maxHeight: 420 }}>
                  <AnimatePresence>
                    {messages.map((m, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className={`p-2 rounded ${m.from === userName ? 'bg-indigo-600 ml-auto' : 'bg-slate-700'}`}>
                        <div className="text-xs opacity-80">{m.from} • {new Date(m.time).toLocaleTimeString()}</div>
                        <div className="text-sm">{m.text}</div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="mt-3 flex gap-2">
                  <input value={chatValue} onChange={(e) => setChatValue(e.target.value)} className="flex-1 px-3 py-2 rounded bg-slate-900 text-white" placeholder="Type a message..." />
                  <button onClick={sendMessage} className="px-3 py-2 bg-emerald-600 rounded">Send</button>
                </div>
              </div>

              <div className="p-3 bg-slate-800/40 rounded">
                <div className="text-sm font-semibold mb-2">Participants</div>
                <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                  {participants.map((p) => (
                    <div key={p.socketId} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm">{p.name || 'Guest'}</div>
                        <div className="text-xs text-gray-400">{p.socketId}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-2 py-1 text-xs border rounded">Pin</button>
                        <button className="px-2 py-1 text-xs border rounded">Mute</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transcript panel (new) */}
              <div className="p-3 bg-slate-800/40 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold">Transcript</div>
                  <div className="flex gap-2">
                    {!isTranscribing ? (
                      <button onClick={startTranscription} className="px-3 py-1 bg-emerald-600 rounded text-sm">Start Transcript</button>
                    ) : (
                      <button onClick={stopTranscription} className="px-3 py-1 bg-red-600 rounded text-sm">Stop Transcript</button>
                    )}
                  </div>
                </div>
                <div className="text-xs max-h-48 overflow-auto whitespace-pre-wrap bg-slate-900/30 p-2 rounded">
                  {transcripts.length ? transcriptText : "No transcript yet"}
                </div>
                <div className="mt-2 text-xs text-gray-400">Transcription is processed server-side and updates will appear here.</div>
              </div>
            </motion.aside>
          </div>
        </div>

        {/* Bottom controls bar */}
        <motion.div className="bg-slate-800/60 p-4 sticky bottom-0 backdrop-blur-md" variants={cardVariants}>
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-6">
            {/* Mute */}
            <motion.button onClick={toggleMute} whileTap={{ scale: 0.9 }} className={`flex items-center gap-2 px-4 py-2 rounded ${isMuted ? 'bg-yellow-600' : 'bg-slate-700'}`}>
              {/* mic icon */}
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11v2a7 7 0 0 1-7 7h0"/><path d="M12 19v3"/><path d="M9 3v4"/><path d="M15 3v4"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v11"/><path d="M8 5v5a4 4 0 0 0 8 0V5"/></svg>
              )}
              <span className="text-sm cursor-pointer">{isMuted ? 'Unmute' : 'Mute'}</span>
            </motion.button>

            {/* Video */}
            <motion.button onClick={toggleVideo} whileTap={{ scale: 0.9 }} className={`flex items-center gap-2 px-4 py-2 rounded ${videoOn ? 'bg-slate-700' : 'bg-red-600'}`}>
              {videoOn ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="15" height="10" rx="2" ry="2"/><path d="M23 7l-6 5 6 5z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><rect x="2" y="7" width="15" height="10" rx="2" ry="2"/><path d="M23 7l-6 5 6 5z"/></svg>
              )}
              <span className="text-sm cursor-pointer">{videoOn ? 'Stop Video' : 'Start Video'}</span>
            </motion.button>

            {/* Screen share */}
            <motion.button onClick={toggleScreenShare} whileTap={{ scale: 0.9 }} className={`flex items-center gap-2 px-4 py-2 rounded ${screenSharing ? 'bg-indigo-600' : 'bg-slate-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><polyline points="8 21 12 17 16 21"/></svg>
              <span className="text-sm cursor-pointer">{screenSharing ? 'Stop Share' : 'Share Screen'}</span>
            </motion.button>

            {/* End Call (red) */}
            <motion.button onClick={endCall} whileTap={{ scale: 0.92 }} className="flex items-center gap-2 px-5 py-3 bg-red-600 rounded-full text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2 11 11 0 0 1-11-11 2 2 0 0 1 2-2h1.5"/><path d="M7 10a2 2 0 0 0-2-2H3.5"/></svg>
              <span className="text-sm cursor-pointer font-semibold">End Call</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
