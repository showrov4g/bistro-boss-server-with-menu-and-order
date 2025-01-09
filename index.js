const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require('stripe')('sk_test_51Qf2e9AVKATRvdeowuRQkx6tRbjYOVucbKAkyt2wSEQ9KLcbyPStUZnITs2kvzaSzKglC2ViSfTesWclYRd42jAz004FUOio9i');
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.23lvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const userCollection = client.db("BistroBoss").collection("users");
    const menuCollection = client.db("BistroBoss").collection("menu");
    const reviewCollection = client.db("bistroDb").collection("reviews");
    const cartCollection = client.db("bistroDb").collection("carts");
    // jaw related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRECT, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // middleWares

    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Forbidden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRECT, (error, decoded) => {
        if (error) {
          return res.status(402).send({ message: "Forbidden Access" });
        }
        req.decoded = decoded;
        next();
      });
    };
    // admin api
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        res.status(403).send({ message: "forbidden access" });
      }
    };

    //  user data collection
    app.post("/users", verifyAdmin, async (req, res) => {
      const user = req.body;
      // insert email if user isn't exit
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already Existing" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // user data getting
    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
    // user role change api
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // menu related apis
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    // menu item post
    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });
    // menu item delete api
    app.delete('/menu/:id', async (res, req) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result)
    });
    // menu single item get for update 
    app.get('/menu/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId}
      const result = await menuCollection.findOne(query);
    })

    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    // cart details collection
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });
    // user cart data find
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    // payment Intent api create 
    app.post('/create-checkout-session', async(req,res)=>{
      const {price}= req.body;
      const amount = parseInt (price * 100)
      console.log("amount", amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "USD",
        payment_method_types: ["card"]
      })
      res.send({
        clientSecret : paymentIntent.client_secret
      })
    })
    // payment store api 
    app.post('/payments', async(req,res)=>{
      
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("boss is sitting");
});

app.listen(port, () => {
  console.log(`Bistro boss is sitting on port ${port}`);
});
