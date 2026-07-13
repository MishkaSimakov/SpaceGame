import App from "./App";

App.getInstance().init()
    .then(() => {
        console.log("App started.");
    })
    .catch(err => {
        console.error(err);
    });
