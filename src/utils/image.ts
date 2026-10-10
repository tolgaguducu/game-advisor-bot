import axios from 'axios';

export interface Image {
  data: Buffer;
  mimeType: string;
}

export async function downloadImage(url: string): Promise<Image> {
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  const contentType = response.headers['content-type'];
  return {
    data: Buffer.from(response.data),
    mimeType: typeof contentType === 'string' ? contentType : 'image/jpeg',
  };
}
