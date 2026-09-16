const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/aqua_insure')
  .then(async () => {
    console.log('Connected');
    try {
      const db = mongoose.connection.db;
      console.log('Trying to list collections...');
      const cols = await db.listCollections().toArray();
      console.log('Collections:', cols.map(c => c.name));
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  }).catch(e => { console.error(e); process.exit(1); });
