import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import util from 'util';

// Convert fs.unlink to use promises
const unlinkAsync = util.promisify(fs.unlink);

// Cloudinary configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) {
        console.error('No file path provided');
        return null;
    }

    try {
        // Upload file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        });

        // Attempt to delete the local file
        
try {
            await unlinkAsync(localFilePath);
            console.log('File successfully deleted from local storage');
        } catch (unlinkError) {
            console.error('Error deleting local file:', unlinkError);
        }
        console.log('File uploaded to Cloudinary:', response.url);
        return response;
    } catch (error) {
        console.error('Error uploading file to Cloudinary:', error);

        // Attempt to delete the local file even if upload fails
        try {
            await unlinkAsync(localFilePath);
            console.log('File successfully deleted from local storage after failed upload');
        } catch (unlinkError) {
            console.error('Error deleting local file after failed upload:', unlinkError);
        }

        return null;
    }
};
const deleteFromCloudinary = async (publicId) => {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted file with public_id: ${publicId}`);
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
    }
  };

export  {uploadOnCloudinary, deleteFromCloudinary};
