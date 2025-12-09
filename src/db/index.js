import mongoose from "mongoose";


const connectDB = async()=>{
    try {
       const link = await mongoose.connect(process.env.MONGODB_URL)
       console.log(`\n Connected !! DB HOST : ${link.connection.host} `);
       
        
    } catch (error) {
        console.log(`There is an error while connecting to database ERROR :: ${error}`);
        process.exit(1)
        
    }
}

export default connectDB;