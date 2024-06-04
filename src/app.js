const express = require("express");
const axios = require("axios");
const path = require("path");
const app = express();
const port = 3000;
var connection = require("./database");
const session = require("express-session");

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

app.get("/", function (req, res) {
  const user = req.session.user;
  const error = req.query.error;
  const errorMessages = {
    wrongCred: "Wrong username or password!",
    serverError: "Server Error!",
    missing: "Missing Credentials!",
  };
  if (user) {
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

app.get("/home", authenticatedRoute, (req, res) => {
  const user = req.session.user;
  res.render("pages/home", { user });
});

app.get("/register", function (req, res) {
  res.render("pages/register");
});

app.post("/home", (req, res) => {
  if (req.body.user_name && req.body.password) {
    connection.query(
      `Select id, user_name from users where user_name=? && password=?`,
      [req.body.user_name.toLowerCase(), req.body.password],
      (error, result) => {
        if (error) {
          res.redirect("/?error=serverError");
        } else {
          if (result.length > 0) {
            req.session.user = result[0].id;
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



app.get("/youtube", authenticatedRoute, async(req, res)=>{
  const auth = new google.auth.GoogleAuth({
    // Scopes can be specified either as an array or as a single, space-delimited string.
    scopes: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtubepartner',
      'https://www.googleapis.com/auth/youtubepartner-channel-audit',
    ],
  });

  // Acquire an auth client, and bind it to all future calls
  const authClient = await auth.getClient();
  google.options({auth: authClient});
})

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send("Error logging out");
    }
    res.redirect("/");
  });
});
