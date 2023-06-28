import express from "express";
import {applicationDefault, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import morgan from "morgan";
import http from "http-status-codes";
import cors from "cors"

const app = express()
app.use(morgan("tiny"))
app.use(express.json())
app.use(express.urlencoded({extended: true})) // Allows parsing nested objects.

app.use(cors({
    origin: 'http://localhost:5173', // Local React URL
}))

initializeApp({
    credential: applicationDefault()
});

const db = getFirestore();

// CREATE
app.post("/user", async (req, res) => {

    const {name, age, consent} = req.body
    const user = {
        name: name,
        age: age,
        consent: consent,
        created: now(),
    }

    // TODO: Validation.

    const newUser = await db.collection("user").doc()
    newUser.set({
        id: newUser.id,
        ...user,
    })
        .then(() => (res.status(http.CREATED).send({id: newUser.id})))
        .catch((e) => (errorResponse(e, res)))
})

// READ
app.get("/user/:id", async (req, res) => {

    const id = req.params.id

    await db.collection("user").doc(id).get()
        .then(user => {
            exists(user)
            res.send(user.data())
        })
        .catch((e) => (errorResponse(e, res)))
})

// UPDATE
app.patch("/user/:id", async (req, res) => {

    const id = req.params.id
    const {name, age, consent} = req.body
    const update = {
        name: name,
        age: age,
        consent: consent,
        updated: now(),
    }

    await db.collection("user").doc(id).get()
        .then(user => {
            exists(user)
            user.ref.update({...update})
        })
        .then(() => (res.status(http.NO_CONTENT).send()))
        .catch((e) => (errorResponse(e, res)))
})

// DELETE
app.delete("/user/:id", async (req, res) => {

    const id = req.params.id
    await db.collection("user").doc(id).get()
        .then((user) => {
            exists(user)
            user.ref.delete()
        })
        .then(() => (res.status(http.NO_CONTENT).send()))
        .catch((e) => (errorResponse(e, res)))
})

// SEARCH
app.get("/user", async (req, res) => {

    let search = await db.collection("user")
    if (req.query.q) {
        const qs = (req.query.q instanceof Array) ? req.query.q : [req.query.q]
        for (const q of qs) {
            try {
                let [key, operator, value] = q.split(",")
                value = parse(value)
                // noinspection JSCheckFunctionSignatures
                search = search.where(key, operator, value)
            } catch (e) {
                return errorResponse(e, res)
            }
        }
    }
    await search.get()
        .then((snapshots) => {
            let docs = []
            snapshots.forEach((doc) => {
                docs.push(doc.data())
            })
            res.send(docs)
        })
        .catch((e) => (errorResponse(e, res)))
})

// ROOT
app.get("/", (req, res) => {
    res.send("Hello, World!")
})

// DEFAULT
app.get("*", (req, res) => {
    res.redirect("/")
})

const port = 3000
app.listen(port, () => {
    console.log(`Listening on: ${port}`)
})

function defaultErrorMessage(error) {
    return {
        status: error.status ?? "",
        code: error.code ?? "",
        message: error.message ?? "",
    }
}

function now() {
    return new Date().toISOString()
}

function exists(x) {
    if (!x.exists) {
        const e = new Error(`(${x.id}) Not Found`)
        e.status = http.NOT_FOUND
        throw e
    }
}

function errorResponse(e, res) {
    if (e.code === 9) { // Firestore catcher
        e = new Error("Queries containing both equality & inequality operators on different fields are not allowed. Example: 'name==James' && 'age>=23'")
        e.status = http.BAD_REQUEST
    }
    e.status ??= http.BAD_REQUEST
    res.status(e.status).send(defaultErrorMessage(e))
}

function parse(value) {
    try {
        return JSON.parse(value);
    } catch (_) {
        return value;
    }
}