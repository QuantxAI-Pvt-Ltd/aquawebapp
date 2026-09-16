const mongoose = require('mongoose');
const Pond = require('./models/Pond');
mongoose.connect('mongodb://localhost:27017/aqua')
.then(async () => {
    const p = await Pond.findOne({ photo: { $ne: null } }).lean();
    if (!p) {
        console.log("No pond with photo found. Saving one now to test.");
        const sampleBuffer = Buffer.from("hello world test buffer");
        const newP = new Pond({
            farmId: new mongoose.Types.ObjectId(),
            farmerId: new mongoose.Types.ObjectId(),
            pondNumber: 99,
            name: "Test Pond",
            photo: sampleBuffer
        });
        await newP.save();
        console.log("Saved test pond. Re-run script.");
        process.exit(0);
    }
    console.log("_id:", p._id);
    console.log("type:", typeof p.photo);
    console.log("instanceof mongodb.Binary:", p.photo instanceof mongoose.mongo.Binary);
    console.log("instanceof Buffer:", p.photo instanceof Buffer);
    
    let base64 = "";
    if (p.photo instanceof mongoose.mongo.Binary) {
        base64 = p.photo.toString('base64');
        console.log("Binary toString length:", base64.length);
        if (base64.length === 0 && p.photo.buffer) {
             console.log("Binary buffer length:", p.photo.buffer.toString('base64').length);
        }
    } else if (p.photo instanceof Buffer) {
        base64 = p.photo.toString('base64');
        console.log("Buffer toString length:", base64.length);
    }
    
    process.exit(0);
});
