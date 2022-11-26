const express = require("express");
const app = express();
var cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();
const jwt = require("jsonwebtoken");
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

    // app.get("/appointmentOptions", async (req, res) => {
    //   const date = req.query.date;
    //   console.log(date);
    //   const query = {};
    //   const options = await appointmentCollection.find(query).toArray();
    //   const bookingQuery = { appointmentDate: date };
    //   const alreadyBooked = await bookingsCollection
    //     .find(bookingQuery)
    //     .toArray();
    //   // code carefully
    //   options.forEach((option) => {
    //     const optionBooked = alreadyBooked.filter(
    //       (book) => book.treatment === option.name
    //     );
    //     const bookedSlots = optionBooked.map((book) => book.slots);
    //     const remainingSlots = option.slots.filter(
    //       (slot) => !bookedSlots.includes(slot)
    //     );
    //     option.slots = remainingSlots;
    //     // console.log(date, option.name, bookedSlots, remainingSlots.length);
    //   });
    //   // console.log(result);
    //   res.send(options);
    // });

    // find a specific name, price or anything

    // app.get("/appointmentSpecialty", async (req, res) => {
    //   const query = {};
    //   const result = await appointmentCollection
    //     .find(query)
    //     .project({ name: 1 })
    //     .toArray();
    //   res.send(result);
    // });

    // node MOngoDb Naming Convenstion

    // bookings API
    // app.get('/bookings')
    // app.get('/bookings/:id')
    // app.post('/bookings')
    // app.patch('/bookings/:id)
    // app.delete('/bookings/:id)

    // app.post("/bookings", async (req, res) => {
    //   const booking = req.body;

    //   const query = {
    //     appointmentDate: booking.appointmentDate,
    //     treatment: booking.treatment,
    //     email: booking.email,
    //   };
    //   const alreadyBooked = await bookingsCollection.find(query).toArray();

    //   if (alreadyBooked.length) {
    //     const message = `you already have a booking on ${booking.appointmentDate}`;
    //     return res.send({ acknoledged: false, message });
    //   }

    //   const result = await bookingsCollection.insertOne(booking);
    //   console.log(result);
    //   res.send(result);
    // });

    // get booking info from mongoDb

    // app.get("/bookings", verifyJWT, async (req, res) => {
    //   const decoded = req.decoded;
    //   console.log("inside booking api", decoded);

    //   if (decoded.email !== req.query.email) {
    //     res.status(401).send({ message: "Unauthorized access" });
    //   }
    //   const email = req.query.email;
    //   const query = {
    //     email: email,
    //   };
    //   const bookings = await bookingsCollection.find(query).toArray();
    //   res.send(bookings);
    // });

    // send user info to the database

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

    // get sellers from database alluser by email

    app.get("/users/Seller/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send({ isSeller: user?.userrole === "Seller" });
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

    // Delete user from database as admin

    app.delete("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
      console.log(result);
    });

    // insert users in the database
    app.post("/users", async (req, res) => {
      const users = req.body;
      const result = await userCollection.insertOne(users);
      res.send(result);
    });
    // Post doctors
    app.post("/doctors", async (req, res) => {
      const doctors = req.body;
      const result = await doctorsCollections.insertOne(doctors);
      res.send(result);
    });

    // get all doctors
    app.get("/managedoctors", async (req, res) => {
      const query = {};
      const result = await doctorsCollections.find(query).toArray();
      res.send(result);
    });

    app.delete("/managedoctors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await doctorsCollections.deleteOne(query);
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
