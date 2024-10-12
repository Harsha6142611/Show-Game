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
        if (userVideo.current) {
          userVideo.current.srcObject = localStream;
        }

        socket.emit('joinRoom', { roomId, username });

        // Handle new users joining the room
        socket.on('userJoined', ({ id }) => {
          const peer = createPeerConnection(id);
          peer.createOffer()
            .then(offer => peer.setLocalDescription(offer))
            .then(() => {
              socket.emit('sendSignal', { roomId, signalData: peer.localDescription, to: id });
            });
        });

        // Handle signal reception
        socket.on('receiveSignal', ({ signalData, from }) => {
          console.log("Received signal from: " + from);
          handleReceiveSignal(signalData, from);
        });

        // Handle ICE candidate reception
        socket.on('receiveIceCandidate', ({ candidate, from }) => {
          console.log("Received ICE candidate from: " + from);
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
      }).catch(error => console.error('Error accessing media devices.', error));

    return () => {
      socket.off('userJoined');
      socket.off('receiveSignal');
      socket.off('receiveIceCandidate');
      socket.off('userDisconnected');
    };
  }, [roomId, username, socket]);

  const handleReceiveSignal = (signalData, from) => {
    const peer = createPeerConnection(from);

    peer.setRemoteDescription(new RTCSessionDescription(signalData))
      .then(() => {
        if (signalData.type === 'offer') {
          return peer.createAnswer();
        }
      })
      .then(answer => {
        if (answer) {
          peer.setLocalDescription(answer);
          socket.emit('sendSignal', { roomId, signalData: answer, to: from });
        }
      });
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

    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    return peer;
  };

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
        
        {/* Box with background behind user's own video */}
        <Box position="relative" height="400px" width="300px" display="inline-block" p="10px" bg="gray.200" borderRadius="10px">
          <video
            ref={userVideo}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '50%', borderRadius: '20px', zIndex: 1 }} // Set width to 100%
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
              autoPlay
              playsInline
              style={{ width: '100%', borderRadius: '10px', zIndex: 1 }} // Set width to 100%
              ref={(el) => {
                if (el && remoteStreams[peerId]) {
                  el.srcObject = remoteStreams[peerId];
                }
              }}
            />
          </Box>
        ))}
      </div>
    </div>
  );
};

export default VideoChat;
