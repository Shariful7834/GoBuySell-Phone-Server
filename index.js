const express = require("express");
const app = express();
var cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRETE_KEY);

// middleware
app.use(cors());
app.use(express.json());

// MongoDb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.y2saknb.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    const categoriesCollections = client
      .db("Gobuysellphone")
      .collection("categories");
    const phoneCollections = client
      .db("Gobuysellphone")
      .collection("allusedProducts");
    const userCollection = client.db("Gobuysellphone").collection("users");
    const bookingsCollection = client
      .db("Gobuysellphone")
      .collection("bookings");

    const addProductsCollections = client
      .db("Gobuysellphone")
      .collection("addproducts");

    const paymentCollections = client
      .db("Gobuysellphone")
      .collection("payments");
    const questionsCollections = client
      .db("Gobuysellphone")
      .collection("Questions");

    //Get question
    app.get("/questions", async (req, res) => {
      const query = {};
      const questions = await questionsCollections.find(query).toArray();
      res.send(questions);
    });

    // get advertisement items

    app.get("/advertisements", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await addProductsCollections.find(query).toArray();
    });

    // payment intent

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: "usd",
        amount: amount,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // Payment
    app.post("/payments", async (req, res) => {
      // const decodedEmail = req.decoded.email;
      // const query = { email: decodedEmail };
      // const user = await userCollection.findOne(query);
      // if (user.userrole !== "Buyer") {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const payment = req.body;
      const result = await paymentCollections.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });
    //get categoris of the used phone from database

    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoriesCollections.find(query).toArray();
      res.send(categories);
    });

    // Get all used product by category id

    app.get("/categoryUsed/:phone_id", async (req, res) => {
      const id = req.params.phone_id;
      const query = {
        phone_id: id,
      };
      const category = await phoneCollections.find(query).toArray();
      res.send(category);
    });

    // Post Buyer orders
    app.post("/buyerBookingItems", async (req, res) => {
      const booking = req.body;
      // const query = {
      //   email: email.booking,
      // };
      // const alreadyBooked = await bookingsCollection.find(query).toArray();
      // if (alreadyBooked.length > 0) {
      //   const message = `You already booked`;
      //   return res.send({ acknowledge: false, message });
      // }
      const result = await bookingsCollection.insertOne(booking);
      console.log(result);
      res.send(result);
    });

    // Get Buyer orders
    app.get("/buyerorders", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const orders = await bookingsCollection.find(query).toArray();
      console.log(orders);
      res.send(orders);
    });

    // buyer booking by id
    app.get("/buyerorders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const paymentOrder = await bookingsCollection.findOne(query);
      res.send(paymentOrder);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const user = await userCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "10h",
        });
        return res.send({ accessToken: token });
      }
      console.log(user);
      res.status(403).send({ accessToken: "" });
    });

    // get all users
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await userCollection.find(query).toArray();
      res.send(users);
    });

    // get admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // get buyers from all users by email

    app.get("/users/Buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send({ isBuyer: user?.userrole === "Buyer" });
    });
    app.get("/users/:userrole", async (req, res) => {
      const userrole = req.params.userrole;
      const query = { userrole: "Buyer" };
      const user = await userCollection.find(query).toArray();
      res.send(user);
    });

    // get sellers from database alluser by email

    app.get("/users/Seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send({ isSeller: user?.userrole === "Seller" });
    });
    app.get("/users/Seller/:userrole", async (req, res) => {
      const userrole = req.params.userrole;
      const query = { userrole: userrole };
      const user = await userCollection.find(query).toArray();
      res.send(user);
    });

    // update user as admin

    app.put("/users/admin/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);
      if (user.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // verify seller

    app.put("/users/seller/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await userCollection.findOne(query);
      if (user.userrole !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }

      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          userrole: "Seller",
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    // insert users in the database
    app.post("/users", async (req, res) => {
      const users = req.body;
      const result = await userCollection.insertOne(users);
      res.send(result);
    });

    // delete user from dashboard admin page
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // add products from seller
    app.post("/addproducts", async (req, res) => {
      const addproducts = req.body;
      const result = await addProductsCollections.insertOne(addproducts);
      res.send(result);
    });
    // get all added products

    app.get("/myproducts", async (req, res) => {
      const email = req.query.email;
      const query = {
        email: email,
      };
      const result = await addProductsCollections.find(query).toArray();
      res.send(result);
    });
    // deleting product
    app.delete("/manageproducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await addProductsCollections.deleteOne(query);
      res.send(result);
    });

    // Update status of product

    app.patch("/manageproducts/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status,
        },
      };
      const result = await addProductsCollections.updateOne(query, updateDoc);
      res.send(result);
    });
  } finally {
  }
}
run().catch((error) => console.error(error));
app.get("/", (req, res) => {
  res.send("GoBUySell server is running");
});

app.listen(port, () => {
  console.log(`System running on the port ${port}`);
});
