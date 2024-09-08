import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  public firebaseApp: admin.app.App;
  public bucketName = 'test_bucket1232134';

  constructor() {
    const adminConfig: admin.ServiceAccount = {
      projectId: process.env.FS_PROJECT_ID,
      privateKey: process.env.FS_PRIVATE_KEY.replace(/\\n/gm, '\n'),
      clientEmail: process.env.FS_CLIENT_EMAIL,
    };

    this.firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(adminConfig),
    });
  }

  async uploadFile(filePath: string, file: Buffer) {
    const result = await this.firebaseApp
      .storage()
      .bucket(this.bucketName)
      .file(filePath)
      .save(file);

    return result;
  }

  async downloadFile(path: string) {
    const [result] = await this.firebaseApp
      .storage()
      .bucket(this.bucketName)
      .file(path)
      .download();

    return result;
  }

  async removeFile(filePath: string) {
    await this.firebaseApp
      .storage()
      .bucket(this.bucketName)
      .file(filePath)
      .delete();
  }
}
