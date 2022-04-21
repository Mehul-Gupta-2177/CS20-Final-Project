var http = require('http');
var fs = require('fs');
var formidable = require('formidable');
const MongoClient = require("mongodb").MongoClient;
const url = "mongodb+srv://user_01:user_01_p@cluster0.b565f.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

http.createServer(function (req, res) {
    if(req.url == "/"){
        // home page
        console.log("requesting index");
       
        let index = "index.html";
        fs.readFile(index, function (err, txt) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(txt);
            res.end();
        });
    }
    else if (req.url == "/venue") {
        // venue page
        console.log("requesting venue");

        if (req.method.toLowerCase() == "post") {
            // venue submission form submitted
            var form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
                if (err) {console.log(err);}
            
                MongoClient.connect(url, { useUnifiedTopology: false }, async function (err, db) {
                    if (err) {console.log(err);}
                    
                    let dbo = db.db("Venues");
                    let collection = dbo.collection("Restaurants");

                    await collection.insertOne({
                        name          : fields["name"],
                        streetAddress : fields["streetAddress"],
                        cityState     : fields["cityState"],
                        zipCode       : fields["zipCode"],
                        minCapacity   : fields["minCapacity"],
                        maxCapacity   : fields["maxCapacity"],
                        flatFee       : fields["flatFee"],
                        website       : fields["website"]
                    });

                    db.close();
                });
            });

            let index = "index.html";
            fs.readFile(index, function (err, txt) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(txt);
                res.write("<script>alert('Thank you for adding your venue!')</script>")
                res.end();
            });
        }
        else {
            let venue = "venue_form.html";
            fs.readFile(venue, function (err, txt) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(txt);
                res.end();
            });
        }
    }
    else if (req.url == "/booking") {
        // customer page
        console.log("requesting booking");

        if (req.method.toLowerCase() == "post") {
            // customer inquery form submitted
            var form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
                if (err) {console.log(err);}
            
                MongoClient.connect(url, { useUnifiedTopology: false }, async function (err, db) {
                    if (err) {console.log(err);}
                    
                    let dbo = db.db("Venues");
                    let collection = dbo.collection("Restaurants");

                    db.close();
                });
            });
        }
        else {
            let booking = "booking_form.html";
            fs.readFile(booking, function (err, txt) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(txt);
                res.end();
            });
        }
    }
    else if (req.url == "/testimonials") {
        // testimonials page
        let testimonials = "testimonials.html";
        fs.readFile(testimonials, function (err, txt) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(txt);
            res.end();
        });
    }
    else if (req.url == "/contact") {
        // contact page
        let contact = "contact.html";
        fs.readFile(contact, function (err, txt) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(txt);
            res.end();
        });
    }
    else {
        // error page
        let error = "error.html";
        fs.readFile(error, function (err, txt) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(txt);
            res.end();
        });
    }
}).listen(process.env.PORT || 8081);





















