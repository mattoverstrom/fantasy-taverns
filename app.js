const express = require('express');

require('dotenv').config();
require('./global_functions');
const userController = require('./controllers/UsersController');
const tavernController = require('./controllers/TavernsController');
const guestController = require('./controllers/GuestsController');
const bodyParser = require('body-parser');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { poolPromise } = require('./data/db');
const sql = require('mssql');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
let opts = {};

opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.jwt_encryption;

passport.use(
    new JwtStrategy(opts, async (jwtPayload, done) => {
        let err, user;
        const pool = await poolPromise;

        try {
            user = await pool
                .request()
                .input('Id', sql.Int, jwtPayload.user_id)
                .query(
                    'select ID, UserName, RoleID, TavernID from users where Id = @Id',
                );
            user = user.recordset.shift();
        } catch (e) {
            console.error(e);
        }

        if (err) {
            return done(err, false);
        }
        if (user) {
            return done(null, user);
        }
        return done(null, false);
    }),
);
// CORS
app.use((req, res, next) => {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Request methods you wish to allow
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS, PUT, PATCH, DELETE',
    );
    // Request headers you wish to allow
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-Requested-With, content-type, Authorization, Content-Type',
    );
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);
    // Pass to next layer of middleware
    next();
});

app.post('/users', userController.create);
app.post('/login', userController.login);
app.get('/taverns', tavernController.getTaverns);
app.get('/my-tavern', passport.authenticate('jwt', { session: false }), tavernController.getTavern);
app.get('/my-tavern/rooms', passport.authenticate('jwt', { session: false }), tavernController.getRooms);
app.get('/my-tavern/rooms/:id', passport.authenticate('jwt', { session: false }), tavernController.getRoom);
app.post('/my-tavern/rooms', passport.authenticate('jwt', { session: false }), tavernController.saveRoom);
app.get('/guests', passport.authenticate('jwt', { session: false }), guestController.getGuests);

console.log('SERVER READY');
module.exports = app;
