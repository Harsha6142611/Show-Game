import React, { useRef, useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';

const VideoChat = ({ socket, roomId, username }) => {
  const [stream, setStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnections = useRef({});
  const userVideo = useRef();

  useEffect(() => {
    // Get local video and audio stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((localStream) => {
        setStream(localStream);

        // Emit that the user has joined the room
        socket.emit('joinRoom', { roomId, username });

        // Handle new users joining the room
        socket.on('userJoined', ({ id }) => {
          console.log(`User ${id} has joined the room.`);
          const peer = createPeerConnection(id);
          
          // Add local stream tracks to this new peer connection
          if (stream) {
            stream.getTracks().forEach(track => peer.addTrack(track, stream));
          }

          peer.createOffer()
            .then(offer => peer.setLocalDescription(offer))
            .then(() => {
              socket.emit('sendSignal', { roomId, signalData: peer.localDescription, to: id });
            });
        });

        // Handle receiving signal
        socket.on('receiveSignal', ({ signalData, from }) => {
          handleReceiveSignal(signalData, from);
        });

        // Handle ICE candidate reception
        socket.on('receiveIceCandidate', ({ candidate, from }) => {
          handleNewIceCandidate(candidate, from);
        });

        // Handle user disconnection
        socket.on('userDisconnected', ({ id }) => {
          if (peerConnections.current[id]) {
            peerConnections.current[id].close();
            delete peerConnections.current[id];
            setRemoteStreams((prevStreams) => {
              const updatedStreams = { ...prevStreams };
              delete updatedStreams[id];
              return updatedStreams;
            });
          }
        });
      })
      .catch(error => console.error('Error accessing media devices.', error));

    return () => {
      socket.off('userJoined');
      socket.off('receiveSignal');
      socket.off('receiveIceCandidate');
      socket.off('userDisconnected');
    };
  }, [roomId, username, socket, stream]);

  // Bind local stream to video element only when stream is available
  useEffect(() => {
    if (userVideo.current && stream) {
      userVideo.current.srcObject = stream;
    }
  }, [stream]);

  const handleReceiveSignal = (signalData, from) => {
    let peer = peerConnections.current[from];

    if (!peer) {
      peer = createPeerConnection(from);
    }

    peer.setRemoteDescription(new RTCSessionDescription(signalData))
      .then(() => {
        if (signalData.type === 'offer') {
          return peer.createAnswer();
        }
      })
      .then(answer => {
        if (answer) {
          return peer.setLocalDescription(answer).then(() => {
            socket.emit('sendSignal', { roomId, signalData: answer, to: from });
          });
        }
      })
      .catch((err) => console.error('Error handling signal: ', err));
  };

  const handleNewIceCandidate = (candidate, from) => {
    const peer = peerConnections.current[from];
    if (peer) {
      peer.addIceCandidate(new RTCIceCandidate(candidate))
        .catch(e => console.error('Error adding ICE candidate: ', e));
    }
  };

  const createPeerConnection = (peerId) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnections.current[peerId] = peer;

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('sendIceCandidate', { roomId, candidate: event.candidate, to: peerId });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStreams((prevStreams) => ({
        ...prevStreams,
        [peerId]: event.streams[0],
      }));
    };

    return peer;
  };

  // Bind remote streams to video elements when they are updated
  useEffect(() => {
    Object.keys(remoteStreams).forEach(peerId => {
      const videoElement = document.getElementById(`remoteVideo-${peerId}`);
      if (videoElement && videoElement.srcObject !== remoteStreams[peerId]) {
        videoElement.srcObject = remoteStreams[peerId];
      }
    });
  }, [remoteStreams]);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
        {/* User's own video */}
        <Box
          position="relative"
          height="400px"
          width="300px"
          display="inline-block"
          p="10px"
          bg="gray.200"
          borderRadius="10px"
        >
          <video
            ref={userVideo}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '50%', borderRadius: '20px', zIndex: 1 }}
          />
        </Box>

        {/* Display remote video streams */}
        {Object.keys(remoteStreams).map((peerId) => (
          <Box
            key={peerId}
            position="relative"
            display="inline-block"
            p="10px"
            bg="gray.200"
            borderRadius="10px"
          >
            <video
              id={`remoteVideo-${peerId}`}
              autoPlay
              playsInline
              style={{ width: '100%', borderRadius: '10px', zIndex: 1 }}
            />
          </Box>
        ))}
      </div>
    </div>
  );
};

export default VideoChat;
