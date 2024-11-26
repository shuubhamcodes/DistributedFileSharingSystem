// Copy the content of server1.js and change the port to 50053
server.bindAsync('0.0.0.0:50053', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Server 3 running at http://0.0.0.0:50053');
    server.start();
  });
  