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

//DATABASE
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
   serverApi: ServerApiVersion.v1,
});

const run = async () => {
   try {
      await client.connect();
      console.log('MongoDB is connected');
      const PartsCollection = client.db('AutoTeile').collection('parts');
      const UsersCollection = client.db('AutoTeile').collection('users');
      const OrdersCollection = client.db('AutoTeile').collection('orders');
      const PaymentCollection = client.db('AutoTeile').collection('payment');
      const reviewsCollection = client.db('AutoTeile').collection('reviews');

      const verifyAdmin = async (req, res, next) => {
         const requester = req.decoded.email;
         const account = await UsersCollection.findOne({
            email: requester,
         });
         if (account.role === 'admin') {
            next();
         } else {
            res.status(403).send({ message: 'forbidden' });
         }
      };

      // //PAYMENT
      // app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      //    const { total } = req.body;
      //    const amount = total * 100;

      //    const paymentIntent = await stripe.paymentIntents.create({
      //       amount: amount,
      //       currency: 'usd',
      //       payment_method_types: ['card'],
      //    });
      //    res.send({ clientSecret: paymentIntent.client_secret });
      // });

      // ROUTES

      // GET ALL PARTS
      app.get('/parts', async (req, res) => {
         const parts = await PartsCollection.find({}).toArray();
         res.send(parts);
      });

      //ADD NEW PARTS
      app.post('/parts', verifyJWT, verifyAdmin, async (req, res) => {
         const part = req.body;
         const result = await PartsCollection.insertOne(part);
         res.send(result);
      });
      //DELETE PARTS
      app.delete('/parts/:id', verifyJWT, verifyAdmin, async (req, res) => {
         const id = req.params.id;
         const deleted = await PartsCollection.deleteOne({
            _id: ObjectId(id),
         });
         res.send(deleted);
         console.log(deleted);
      });

      //GET PART BY ID
      app.get('/parts/:id', verifyJWT, async (req, res) => {
         const part = await PartsCollection.findOne({
            _id: ObjectId(req.params.id),
         });
         res.send(part);
      });

      //REVIEW

      //POST REVIEW
      app.post('/reviews', verifyJWT, async (req, res) => {
         const review = req.body;
         const result = await reviewsCollection.insertOne(review);
         res.send(result);
      });
      //GET ALL REVIEWS
      app.get('/reviews', async (req, res) => {
         const reviews = await reviewsCollection.find({}).toArray();
         res.send(reviews);
      });

      // ORDERS

      //GET ALL ORDERS
      app.get('/orders', verifyJWT, async (req, res) => {
         const orders = await OrdersCollection.find({}).toArray();
         res.send(orders);
      });

      //GET  ORDER BY USER EMAIL
      app.get('/orders/:email', verifyJWT, async (req, res) => {
         const orders = await OrdersCollection.find({
            email: req.params.email,
         }).toArray();

         res.send(orders);
      });

      //UPDATE ORDER STATUS

      app.patch('/orders/:id', verifyJWT, async (req, res) => {
         const id = req.params.id;
         const payment = req.body;
         const filter = { _id: ObjectId(id) };
         const updatedDoc = {
            $set: {
               paid: true,
               transactionId: payment.transactionId,
            },
         };

         const result = await PaymentCollection.insertOne(payment);
         const updatedBooking = await OrdersCollection.updateOne(filter, updatedDoc);
         res.send(updatedBooking);
      });

      //DELETE ORDER
      app.delete('/orders/:id', verifyJWT, async (req, res) => {
         const id = req.params.id;
         const deleted = await OrdersCollection.deleteOne({
            _id: ObjectId(id),
         });
         res.send(deleted);
      });

      //GET ORDER BY ID
      app.get('/order/:id', verifyJWT, async (req, res) => {
         const id = req.params.id;

         const product = await OrdersCollection.findOne({
            _id: ObjectId(id),
         });

         res.send(product);
      });

      //UPDATE ORDER SHIPPING STATUS
      app.put('/orders/:id', verifyJWT, async (req, res) => {
         const status = req.body;
         const id = req.params.id;
         const filter = { _id: ObjectId(id) };

         const updateDoc = {
            $set: status,
         };
         const result = await OrdersCollection.updateOne(filter, updateDoc);
         res.send(result);
      });

      //POST ORDER BY EMAIL
      //?USER CAN NOT ORDER SAME PRODUCT TWICE
      app.post('/orders', verifyJWT, async (req, res) => {
         const order = req.body;
         const query = {
            productId: order.productId,
            email: order.email,
         };
         const exist = await OrdersCollection.findOne(query);

         if (exist?.productId === order?.productId && exist?.email === order?.email) {
            return res.send({
               success: false,
               message: 'Order already exist',
            });
         }
         const result = await OrdersCollection.insertOne(order);

         return res.send({ success: true, result });
      });

      //USERS

      //GET ALL USERS
      app.get('/users', verifyJWT, async (req, res) => {
         const users = await UsersCollection.find({}).toArray();
         res.send(users);
      });

      //UPDATE OR CREATE USER
      app.put('/users/:email', async (req, res) => {
         const user = req.body;
         const email = req.params.email;
         const filter = { email: email };
         const options = { upsert: true };
         const updateDoc = {
            $set: user,
         };
         const result = await UsersCollection.updateOne(filter, updateDoc, options);
         const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
            expiresIn: '30d',
         });
         res.send({ result, accessToken });
      });

      //GET USER BY EMAIL
      app.get('/users/:email', verifyJWT, async (req, res) => {
         const user = await UsersCollection.findOne({
            email: req.params.email,
         });
         res.send(user);
      });

      //ADMIN

      // Login endpoint
      app.post('/login', async (req, res) => {
      // Authenticate user here and generate JWT token
      const token = jwt.sign({ email: 'medn@list.ru' }, 'your-secret-key');
      res.json({ token });
      });
      
      //MAKE ADMIN
      app.put('/users/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
         const email = req.params.email;
         const filter = { email: email };
         const updateDoc = {
            $set: { role: 'admin' },
         };
         const result = await UsersCollection.updateOne(filter, updateDoc);
         res.send(result);
      });

      //GET ADMIN
      app.get('/admin/:email', async (req, res) => {
         const email = req.params.email;
         const user = await UsersCollection.findOne({ email: email });
         const isAdmin = user.role === 'admin';
         res.send({ admin: isAdmin });
      });
   } catch (error) {
      console.log(error);
   } finally {
   }
};

run().catch(console.dir);

app.get('/', async (req, res) => {
    res.send('Hello World');
 });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
 });
