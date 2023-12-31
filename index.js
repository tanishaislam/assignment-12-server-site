const express = require('express')
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;

//middelware
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.naursbo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("assignment12").collection("users");
    const roomCollection = client.db("assignment12").collection("rooms");
    const cartsCollection = client.db("assignment12").collection("carts");
    const anousCollection = client.db("assignment12").collection("anous");
    const paymentCollection = client.db("assignment12").collection("payments");

    //jwt related api
    app.post('/jwt', async (req, res) =>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '4h'})
        res.send({ token })
    })

    //middelware
    const verifyToken = (req, res, next) =>{
        // console.log('inside verify token', req.headers.authorization)
        if(!req.headers.authorization){
            res.status(401).send({message: 'forbidded access'})
        }
        const token = req.headers.authorization.split(' ')[1]
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
            if(err){
                res.status(401).send({message: 'forbidded access'})
            }
            req.decoded = decoded;
            next()
        })
        
    }



    //user related apis
    app.post('/users', async (req, res) =>{
        const user = req.body;
        const query = {email: user?.email}
        const extingUser = await usersCollection.findOne(query)
        if(extingUser){
            return res.send({messsage: 'user already exist', insertedId: null})
        }
        const result = await usersCollection.insertOne(user)
        res.send(result)
    })
    app.get('/users', async (req, res) =>{
        const result = await usersCollection.find().toArray()
        res.send(result)
    })

    

    


    //get romms
    app.get('/rooms', async (req, res) =>{
        const page =  parseInt(req.query.page)
        const size = 6;
        const result = await roomCollection.find().skip(page * size).limit(size).toArray()
        res.send(result)
    })

    //rooms count 
    app.get('/roomsCount', async (req, res) =>{
        const count = await roomCollection.estimatedDocumentCount();
        res.send({count})
    })


    //agriment cart 
    app.get('/carts', verifyToken, async (req, res) =>{
        const result = await cartsCollection.find().toArray()
        res.send(result)
    })

    app.post('/carts', async (req, res) =>{
        const cartItem = req.body;
        const result = await cartsCollection.insertOne(cartItem)
        res.send(result)
    })

    app.delete('/carts/:id', async (req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await cartsCollection.deleteOne(query)
        res.send(result)
    })

    // app.patch('/carts/member/:id', async (req, res) =>{
    //     const id = req.params.id;
    //     const filter = {_id: new ObjectId(id)}
    //     const updateDoc = {
    //         $set: {
    //             role: 'member'
    //         }
    //     }
    //     const result = await cartsCollection.updateOne(filter, updateDoc)
    //     res.send(result)
    // })
    app.patch('/carts/member/:id', async (req, res) =>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const updateDoc = {
            $set: {
                role: 'member'
            }
        }
        const result = await cartsCollection.updateOne(filter, updateDoc)
        res.send(result)
    })
    app.patch('/carts/user/:id', async (req, res) =>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const updateDoc = {
            $set: {
                role: 'user'
            }
        }
        const result = await cartsCollection.updateOne(filter, updateDoc)
        res.send(result)
    })

    app.get('/carts/member/:email',verifyToken, async(req, res)=>{
        const email = req.params.email;
        if(email !== req.decoded.email){
          return res.status(403).send({message: 'unauthrozied access'})
        }
        const query = {email: email};
        const user = await cartsCollection.findOne(query)
  
        let member = false;
        if(user){
          member = user?.role === 'member'
        }
        res.send({member})
  
      })



      //annousment collections

      app.post('/anous', async(req, res)=>{
        const anous = req.body;
        const result = await anousCollection.insertOne(anous)
        res.send(result)
      })

      app.get('/anous', verifyToken, async (req, res) =>{
        const result = await anousCollection.find().toArray()
        res.send(result)
    })




    //payment intant
    app.post("/create-payment-intent", async (req, res) => {
        const {price} = req.body;
        const amount = parseInt(price * 100)

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types: ['card'],
          });

          res.send({
            clientSecret: paymentIntent.client_secret,
          });
    }
    )

    app.post('/payments', async (req, res) =>{
        const payment = req.body;
        const paymentResult = await paymentCollection.insertOne(payment)

        res.send(paymentResult)
    })

    app.get('/payments', async (req, res) =>{
        const result = await paymentCollection.find().toArray()

        res.send(result)
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('boss is sitting')
})

app.listen(port, ()=>{
    console.log(`bistro boss is sitting on port ${port}`)
})