import express from "express";
import {applicationDefault, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import morgan from "morgan";
import http from "http-status-codes";

const app = express()
app.use(morgan("tiny"))
app.use(express.json())

initializeApp({
    credential: applicationDefault()
});

const db = getFirestore();

// CREATE
app.post("/user", async (req, res) => {

    const {name, age} = req.body
    const user = {
        name: name,
        age: age,
        created: Now(),
    }

    // 400 Validation errors should be done before sending a request to Firestore.

    const newDoc = await db.collection("user").doc()
    newDoc.set({
        id: newDoc.id,
        ...user,
    })
        .then(() => (res.status(201).send({id: newDoc.id})))
        .catch((e) => (ErrorResponse(e, res)))
})

// READ
app.get("/user/:id", async (req, res) => {

    const id = req.params.id

    await db.collection("user").doc(id).get()
        .then(user => {
            exists(user)
            res.send(user.data())
        })
        .catch((e) => (ErrorResponse(e, res)))
})

// UPDATE
app.patch("/user/:id", async (req, res) => {

    const id = req.params.id
    const {name, age} = req.body
    const update = {
        name: name,
        age: age,
        updated: Now(),
    }

    const reference = await db.collection("user").doc(id)
    await reference.get()
        .then(x => exists(x))
        .then(() => (reference.update({...update})))
        .then(() => (res.send()))
        .catch((e) => (ErrorResponse(e, res)))
})

// DELETE
app.delete("/user/:id", async (req, res) => {

    const id = req.params.id
    await db.collection("user").doc(id).delete()
        .then(() => (res.status(204).send()))
        .catch((e) => (ErrorResponse(e, res)))
})

// SEARCH
app.get("/user", async (req, res) => {

    await db.collection("user").get()
        .then((snapshots) => {
            let docs = []
            snapshots.forEach((doc) => {
                docs.push(doc.data())
            })
            res.send(docs)
        })
        .catch((e) => (ErrorResponse(e, res)))
})

// ROOT
app.get("/", (req, res) => {
    res.send("You are HERE (Root)")
})

// DEFAULT
app.get("*", (req, res) => {
    res.redirect("/")
})

const port = 3000
app.listen(port, () => {
    console.log(`Listening on: ${port}`)
})

function DefaultErrorMessage(error) {
    return {
        status: error.status ?? "",
        code: error.code ?? "",
        message: error.message ?? "",
    }
}

function Now() {
    return new Date().toISOString()
}

function exists(x) {
    if (!x.exists) {
        const e = new Error(`User:'${x.id}' Not Found`)
        e.status = http.NOT_FOUND
        throw e
    }
}

function ErrorResponse(e, res) {
    res.status(e.status ?? http.BAD_REQUEST).send(DefaultErrorMessage(e))
}