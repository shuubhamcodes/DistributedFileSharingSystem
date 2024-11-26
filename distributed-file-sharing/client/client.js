const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const fs = require('fs');
const path = require('path');

const PROTO_PATH = path.resolve(__dirname, '../proto/file_service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const fileServiceProto = grpc.loadPackageDefinition(packageDefinition).FileService;

const client = new fileServiceProto('localhost:50051', grpc.credentials.createInsecure());

function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const metadata = new grpc.Metadata();
  metadata.add('filename', fileName);

  const call = client.UploadFile(metadata, (error, response) => {
    if (error) {
      console.error('Error uploading file:', error);
    } else {
      console.log('Server response:', response.message);
    }
  });

  const readStream = fs.createReadStream(filePath);
  readStream.on('data', (chunk) => {
    call.write({ content: chunk });
  });
  readStream.on('end', () => {
    call.end();
  });
}

function downloadFile(fileName) {
  const call = client.DownloadFile({ fileName });
  const writeStream = fs.createWriteStream(`./downloads/${fileName}`);

  call.on('data', (chunk) => {
    writeStream.write(chunk.content);
  });

  call.on('end', () => {
    console.log(`File ${fileName} downloaded successfully`);
  });
}

// Test the functions
uploadFile('./test.txt'); // Ensure test.txt exists in the root folder
downloadFile('test.txt');
