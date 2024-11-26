const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');
const redis = require('redis');

const PROTO_PATH = path.resolve(__dirname, '../proto/file_service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const fileServiceProto = grpc.loadPackageDefinition(packageDefinition).FileService;

const uploadsDir = path.resolve(__dirname, '../uploads');
const redisClient = redis.createClient(); // For distributed caching

redisClient.connect();

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// gRPC server setup
const server = new grpc.Server();

server.addService(fileServiceProto.service, {
  UploadFile: (call, callback) => {
    let fileBuffer = Buffer.alloc(0);
    const fileName = call.metadata.get('filename')[0];
    const filePath = path.join(uploadsDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    call.on('data', (chunk) => {
      fileBuffer = Buffer.concat([fileBuffer, chunk.content]);
      writeStream.write(chunk.content);
    });

    call.on('end', async () => {
      writeStream.end();
      // Cache the file in Redis
      await redisClient.set(fileName, fileBuffer.toString('base64'));
      callback(null, { success: true, message: 'File uploaded and cached successfully' });
    });
  },

  DownloadFile: async (call) => {
    const fileName = call.request.fileName;
    const filePath = path.join(uploadsDir, fileName);

    // Check cache first
    const cachedFile = await redisClient.get(fileName);
    if (cachedFile) {
      call.write({ content: Buffer.from(cachedFile, 'base64') });
      call.end();
      return;
    }

    // If not in cache, read from file system and cache it
    if (fs.existsSync(filePath)) {
      const readStream = fs.createReadStream(filePath);
      readStream.on('data', (chunk) => {
        call.write({ content: chunk });
      });
      readStream.on('end', async () => {
        const fileContent = fs.readFileSync(filePath).toString('base64');
        await redisClient.set(fileName, fileContent);
        call.end();
      });
    } else {
      call.end();
    }
  },

  Ping: (_, callback) => {
    callback(null, {});
  }
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('Server 1 running at http://0.0.0.0:50051');
  server.start();
});
