// Copy the content of server1.js and change the port to 50052
server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Server 2 running at http://0.0.0.0:50052');
    server.start();
  });
  