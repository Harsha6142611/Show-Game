// import React, { useRef, useState, useEffect } from 'react';
// import { Box,Button } from '@chakra-ui/react';

// const VideoChat = ({ socket, roomId, username }) => {
//   const [stream, setStream] = useState(null);
//   const [remoteStreams, setRemoteStreams] = useState({});
//   const peerConnections = useRef({});
//   const userVideo = useRef();
//   const jitsiContainerRef = useRef(null);

//   useEffect(() => {
//     // Get local video and audio stream
//     navigator.mediaDevices.getUserMedia({ video: true, audio: true })
//       .then((localStream) => {
//         console.log('Local stream obtained:', localStream);
//         setStream(localStream);

//         // Emit that the user has joined the room
//         socket.emit('joinRoom', { roomId, username });
//         console.log(`User ${username} has joined the room: ${roomId}`);

//         // Handle new users joining the room
//         socket.on('userJoined', ({ id }) => {
//           console.log(`User ${id} has joined the room.`);
//           const peer = createPeerConnection(id);

//           // Add local stream tracks to this new peer connection
//           if (localStream) {
//             localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
//             console.log(`Local stream tracks added for user ${id}`);
//           }

//           peer.createOffer()
//             .then(offer => {
//               console.log(`Created offer for user ${id}:`, offer);
//               return peer.setLocalDescription(offer);
//             })
//             .then(() => {
//               socket.emit('sendSignal', { roomId, signalData: peer.localDescription, to: id });
//               console.log(`Sent signal to user ${id}:`, peer.localDescription);
//             });
//         });

//         // Handle receiving signal
//         socket.on('receiveSignal', ({ signalData, from }) => {
//           console.log(`Received signal from ${from}:`, signalData);
//           handleReceiveSignal(signalData, from);
//         });

//         // Handle ICE candidate reception
//         socket.on('receiveIceCandidate', ({ candidate, from }) => {
//           console.log(`Received ICE candidate from ${from}:`, candidate);
//           handleNewIceCandidate(candidate, from);
//         });

//         // Handle user disconnection
//         socket.on('userDisconnected', ({ id }) => {
//           console.log(`User ${id} has disconnected.`);
//           if (peerConnections.current[id]) {
//             peerConnections.current[id].close();
//             delete peerConnections.current[id];
//             setRemoteStreams((prevStreams) => {
//               const updatedStreams = { ...prevStreams };
//               delete updatedStreams[id];
//               return updatedStreams;
//             });
//             console.log(`Peer connection for user ${id} closed.`);
//           }
//         });
//       })
//       .catch(error => console.error('Error accessing media devices:', error));

//     return () => {
//       socket.off('userJoined');
//       socket.off('receiveSignal');
//       socket.off('receiveIceCandidate');
//       socket.off('userDisconnected');
//     };
//   }, [roomId, username, socket]);

//   // Bind local stream to video element only when stream is available
//   useEffect(() => {
//     if (userVideo.current && stream) {
//       userVideo.current.srcObject = stream;
//       console.log('User video bound to local stream.');
//     }
//   }, [stream]);

//   const handleReceiveSignal = (signalData, from) => {
//     console.log(`Handling signal from ${from}:`, signalData);
//     let peer = peerConnections.current[from];

//     if (!peer) {
//       peer = createPeerConnection(from);
//     }

//     peer.setRemoteDescription(new RTCSessionDescription(signalData))
//       .then(() => {
//         if (signalData.type === 'offer') {
//           return peer.createAnswer();
//         }
//       })
//       .then(answer => {
//         if (answer) {
//           console.log(`Created answer for ${from}:`, answer);
//           return peer.setLocalDescription(answer).then(() => {
//             socket.emit('sendSignal', { roomId, signalData: answer, to: from });
//             console.log(`Sent answer to ${from}:`, answer);
//           });
//         }
//       })
//       .catch(err => console.error('Error handling signal:', err));
//   };

//   const handleNewIceCandidate = (candidate, from) => {
//     const peer = peerConnections.current[from];
//     if (peer) {
//       peer.addIceCandidate(new RTCIceCandidate(candidate))
//         .then(() => console.log(`ICE candidate added for ${from}`))
//         .catch(e => console.error('Error adding ICE candidate:', e));
//     }
//   };

//   const createPeerConnection = (peerId) => {
//     console.log(`Creating peer connection for ${peerId}`);
//     const peer = new RTCPeerConnection({
//       iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
//     });

//     peerConnections.current[peerId] = peer;

//     peer.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.emit('sendIceCandidate', { roomId, candidate: event.candidate, to: peerId });
//         console.log(`Sent ICE candidate to ${peerId}:`, event.candidate);
//       }
//     };

//     peer.ontrack = (event) => {
//       setRemoteStreams((prevStreams) => ({
//         ...prevStreams,
//         [peerId]: event.streams[0],
//       }));
//       console.log(`Remote stream added for ${peerId}:`, event.streams[0]);
//     };

//     return peer;
//   };

//   const startJitsi = () => {
//     const domain = 'meet.jit.si';
//     const options = {
//       roomName: roomId,
//       parentNode: jitsiContainerRef.current,
//       userInfo: {
//         displayName: username,
//       },
//     };

//     const api = new window.JitsiMeetExternalAPI(domain, options);
//     api.addEventListener('videoConferenceJoined', () => {
//       console.log(`${username} has joined the Jitsi meeting in room ${roomId}`);
//     });

//     api.addEventListener('readyToClose', () => {
//       console.log('Jitsi meeting ended.');
//     });
//   };



//   // Bind remote streams to video elements when they are updated
//   useEffect(() => {
//     Object.keys(remoteStreams).forEach(peerId => {
//       const videoElement = document.getElementById(`remoteVideo-${peerId}`);
//       if (videoElement && videoElement.srcObject !== remoteStreams[peerId]) {
//         videoElement.srcObject = remoteStreams[peerId];
//         console.log(`Remote video element updated for ${peerId}`);
//       }
//     });
//   }, [remoteStreams]);

//   const totalVideos = 1 + Object.keys(remoteStreams).length;

//   const getVideoStyle = () => {
//     if (totalVideos === 2) {
//       return { width: '50%', height: '100%' };
//     } else if (totalVideos <= 4) {
//       return { width: '50%', height: '50%' };
//     } else if (totalVideos <= 6) {
//       return { width: '33%', height: '50%' };
//     } else if (totalVideos <= 8) {
//       return { width: '25%', height: '50%' };
//     }
//     return { width: '100%', height: '100%' }; // Default for 1 video
//   };

//   return (
//     <Box
//     position="relative"
//     height="400px"  // Fixed height
//     width="300px"   // Fixed width
//     display="flex"
//     flexWrap="wrap"
//     bg="gray.200"
//     borderRadius="10px"
//     justifyContent="center"
//     alignItems="center"
//     p="10px"
//   >
//     {/* Local user video */}
//     {/* <video
//       ref={userVideo}
//       autoPlay
//       playsInline
//       muted
//       style={{
//         ...getVideoStyle(),
//         borderRadius: '10px',
//         marginBottom: '10px'
//       }} */}
//     {/* /> */}

//     {/* Remote video streams */}
//     {/* {Object.keys(remoteStreams).map((peerId) => (
//       <video
//         key={peerId}
//         id={`remoteVideo-${peerId}`}
//         autoPlay
//         playsInline
//         style={{
//           ...getVideoStyle(),
//           borderRadius: '10px',
//           marginBottom: '10px'
//         }}
//       />
//     ))} */}


//       {/* Jitsi Meet Integration */}
//       <div ref={jitsiContainerRef} style={{ width: '100%', height: '100%' }}></div>

//       {/* Button to Start Jitsi */}
//       <Button onClick={startJitsi} mt="20px">
//         Start Jitsi Meeting
//       </Button>
//   </Box>
//   );
// };

// export default VideoChat;


import React, { useRef } from 'react';
import { Box, Button } from '@chakra-ui/react';

const VideoChat = ({ roomId, username }) => {
  const jitsiContainerRef = useRef(null);

  const startJitsi = () => {
    const domain = 'meet.jit.si';
    const options = {
      roomName: roomId,
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: username,
      },
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    api.addEventListener('videoConferenceJoined', () => {
      console.log(`${username} has joined the Jitsi meeting in room ${roomId}`);
    });

    api.addEventListener('readyToClose', () => {
      console.log('Jitsi meeting ended.');
    });
  };

  return (
    <Box
      position="relative"
      height="400px"  // Fixed height
      width="300px"   // Fixed width
      display="flex"
      flexWrap="wrap"
      bg="gray.200"
      borderRadius="10px"
      justifyContent="center"
      alignItems="center"
      p="10px"
    >
      {/* Jitsi Meet Integration */}
      <div ref={jitsiContainerRef} style={{ width: '100%', height: '100%' }}></div>

      {/* Button to Start Jitsi */}
      <Button onClick={startJitsi} mt="20px">
        Start Jitsi Meeting
      </Button>
    </Box>
  );
};

export default VideoChat;
