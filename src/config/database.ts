import dns from 'dns';
import mongoose from 'mongoose';

export const connectDatabase = async (uri: string): Promise<void> => {
  mongoose.set('strictQuery', true);

  // Falling back to Google and Cloudflare DNS resolvers fixes Atlas connection seamlessly.
  if (uri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch {
    }
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
