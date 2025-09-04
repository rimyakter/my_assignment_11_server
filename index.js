const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

//Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bzeuzal.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    await client.connect();
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
const usersCollection = client.db("B2BWholesale").collection("users");
const productsCollection = client.db("B2BWholesale").collection("products");
const ordersCollection = client.db("B2BWholesale").collection("orders");

//Products Related API

app.get("/products", async (req, res) => {
  const category = req.query.category;
  const filter = category ? { category: category } : {};
  const result = await productsCollection.find(filter).toArray();
  res.send(result);
});
//Add product API

// Add a new product
app.post("/products", async (req, res) => {
  const {
    name,
    brand,
    category,
    minQty,
    description,
    price,
    rating,
    image,
    mainQuantity,
    userEmail,
  } = req.body;

  const newProduct = {
    name,
    brand,
    category,
    minQty: Number(minQty),
    description,
    price: Number(price),
    rating: Number(rating),
    image,
    mainQuantity: Number(mainQuantity),
    stock: Number(mainQuantity),
    userEmail: userEmail || "anonymous",
    createdAt: new Date(),
  };

  const result = await productsCollection.insertOne(newProduct);
  res.send({
    productId: result.insertedId,
  });
});

//Products API for single Product

app.get("/products/:productId", async (req, res) => {
  const id = req.params.productId;
  const query = { _id: new ObjectId(id) };
  const result = await productsCollection.findOne(query);
  res.send(result);
});
// Update a product || Update product API
app.put("/products/:productId", async (req, res) => {
  const id = req.params.productId;
  const updatedData = req.body;

  try {
    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Product not found" });
    }

    res.send({ message: "Product updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update product", error: err });
  }
});

//Orders Related API

// Orders API
app.post("/orders", async (req, res) => {
  const { productId, quantity, buyerName, buyerEmail, phone, address } =
    req.body;

  try {
    const id = { _id: new ObjectId(productId) };
    const product = await productsCollection.findOne(id);

    if (!product) return res.status(404).send({ message: "Product not found" });

    if (quantity < product.minQty) {
      return res
        .status(400)
        .send({ message: `Minimum order is ${product.minQty}` });
    }

    if (quantity > product.mainQuantity) {
      return res.status(400).send({ message: "Not enough stock" });
    }

    // Insert new order
    const order = {
      productId: product._id,
      productName: product.name,
      quantity,
      buyerName,
      buyerEmail,
      phone,
      address,
      total: product.price * quantity,
      date: new Date(),
    };

    const result = await ordersCollection.insertOne(order);

    // ✅ Decrement mainQuantity instead of stock
    await productsCollection.updateOne(
      { _id: new ObjectId(productId) },
      { $inc: { mainQuantity: -quantity } }
    );

    res.send({
      message: "Order placed successfully",
      orderId: result.insertedId,
    });
  } catch (err) {
    console.error("Error placing order:", err);
    res
      .status(500)
      .send({ message: "Failed to place order", error: err.message });
  }
});

//Users related API
app.post("/users", async (req, res) => {
  const userInfo = req.body;
  const result = await usersCollection.insertOne(userInfo);
  res.send(result);
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`B2B app listening on port ${port}`);
});
