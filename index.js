const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion } = require('mongodb');

dotenv.config();

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


// JWT verification middleware
function verifyJWT(req, res, next) {
   const authHeader = req.headers.authorization;
   if (!authHeader) {
      return res.status(401).send({ message: 'Unauthorized access' });
   }
   const token = authHeader.split(' ')[1];
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
         return res.status(403).send({ message: 'Forbidden access' });
      }

      req.decoded = decoded;
      next();
   });
}

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
   serverApi: ServerApiVersion.v1,
});

const run = async () => {
   try {
      await client.connect();
      console.log('MongoDB connected');

      const UsersCollection = client.db('AutoTeile').collection('users');

      // GET ALL USERS
      app.get('/users', verifyJWT, async (req, res) => {
         const users = await UsersCollection.find({}).toArray();
         res.send(users);
      });

      // UPDATE OR CREATE USER
      app.put('/users/:email', async (req, res) => {
         const user = req.body;
         const email = req.params.email;
         const filter = { email: email };
         const options = { upsert: true };
         const updateDoc = {
            $set: user,
         };
         const result = await UsersCollection.updateOne(filter, updateDoc, options);
         const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '30d',
         });
         res.send({ result, accessToken });
      });

      // GET USER BY EMAIL
      app.get('/users/:email', verifyJWT, async (req, res) => {
         const user = await UsersCollection.findOne({
            email: req.params.email,
         });
         res.send(user);
      });

   } catch (error) {
      console.error(error);
   }
};

run();

app.get('/', async (req, res) => {
    res.send('Hello World');
 });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
 });
