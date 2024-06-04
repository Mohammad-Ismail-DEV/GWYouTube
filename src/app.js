const express = require("express");
const axios = require("axios");
const path = require("path");
const app = express();
const port = 3000;
var connection = require("./database");
const session = require("express-session");
require("dotenv").config();

const { google } = require("googleapis");
const youtube = google.youtube("v3");

const {
  GOOGLE_API_KEY,
  CLIENT_ID,
  CLIENT_SECRET,
} = require("./utils/environment");

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "http://localhost:3000"
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "GWYouTube",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.get("/", async (req, res) => {
  const user = req.session.user;
  const { code, error } = req.query;
  const errorMessages = {
    wrongCred: "Wrong username or password!",
    serverError: "Server Error!",
    missing: "Missing Credentials!",
  };
  if (user) {
    if (code) {
      const {
        tokens: { access_token, refresh_token },
      } = await oauth2Client.getToken(code);
      req.session.user.access_token = access_token;
      req.session.user.refresh_token = refresh_token;
      connection.query(
        `Update users set access_token = ?, refresh_token = ? WHERE id = ?`,
        [access_token, refresh_token, user.id]
      );
    }

    return res.redirect("/home");
  }
  res.render("pages/login", { errorMessage: errorMessages[error], user });
});

const authenticatedRoute = (req, res, next) => {
  const user = req.session.user;
  if (!user) {
    return res.redirect("/");
  }
  next();
};

app.get("/home", authenticatedRoute, async (req, res) => {
  const { user } = req.session;
  const { access_token, refresh_token } = user;
  let channel = {};
  let videos = [];
  let linked = false;

  if (access_token && refresh_token) {
    linked = true;

    oauth2Client.setCredentials({
      access_token,
      refresh_token,
    });

    const response = await youtube.channels.list({
      part: "snippet",
      access_token: access_token,
      mine: true,
    });
    const channels = response.data.items.map((item) => ({
      id: item.id,
      title: item.snippet.title,
    }));
    channel = channels[0];

    console.log("channel", channel);

    if (channel) {
      const response = await youtube.playlistItems.list({
        part: "snippet",
        access_token: access_token,
        playlistId: "UU" + channel.id.slice(2),
      });

      videos = response.data.items.map((item) => ({
        id: item.id,
        resourceId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.standard.url,
      }));
    }
  }

  res.render("pages/home", { user, channel, videos, linked });
});

app.get("/register", function (req, res) {
  res.render("pages/register");
});

app.post("/login", (req, res) => {
  if (req.body.user_name && req.body.password) {
    connection.query(
      `Select id, user_name, access_token, refresh_token from users where user_name=? && password=?`,
      [req.body.user_name.toLowerCase(), req.body.password],
      (error, result) => {
        if (error) {
          res.redirect("/?error=serverError");
        } else {
          if (result.length > 0) {
            req.session.user = result[0];
            res.redirect("/home");
          } else {
            res.redirect("/?error=wrongCred");
          }
        }
      }
    );
  } else {
    res.redirect("/?error=missing");
  }
});

// app.post("/register", function (req, res) {
//   if (req.body.user_name && req.body.password) {
//     connection.query(
//       `Select user_name from users where user_name='${req.body.user_name}'`,
//       function (error, result) {
//         if (result.length > 0) {
//           res.render("pages/login", {
//             showAlert: true,
//             alertMessage: "User Name Already Taken!",
//           });
//         } else {
//           connection.query(
//             `Insert into users(user_name, password) values('${req.body.user_name}', '${req.body.password}')`,
//             function (error, result) {
//               if (error) {
//                 res.render("pages/register", {
//                   showAlert: true,
//                   alertMessage: error.message,
//                 });
//               } else {
//                 connection.query(
//                   `Select id, user_name from users where id=${result.insertId}`,
//                   function (error, result) {
//                     if (error) {
//                       const response = {
//                         status: 0,
//                         message: error.message,
//                       };
//                       res.render("pages/register", {
//                         showAlert: true,
//                         alertMessage: error.message,
//                       });
//                     } else {
//                       res.render("pages/home", { data: result[0] });
//                     }
//                   }
//                 );
//               }
//             }
//           );
//         }
//       }
//     );
//   } else {
//     res.render("pages/register", {
//       showAlert: true,
//       alertMessage: "Username or Password missing!",
//     });
//   }
// });

app.get("/youtube", authenticatedRoute, async (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtubepartner",
    "https://www.googleapis.com/auth/youtubepartner-channel-audit",
  ];

  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",

    // If you only need one scope you can pass it as a string
    scope: scopes,
  });
  res.redirect(url);

  // Acquire an auth client, and bind it to all future calls
  // const authClient = await auth.getClient();
  // google.options({ auth: authClient, key: GOOGLE_API_KEY });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out");
    }
    res.redirect("/");
  });
});
