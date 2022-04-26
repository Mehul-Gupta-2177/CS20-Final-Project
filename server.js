const http = require('http');
const fs = require('fs');
const formidable = require('formidable');
const MongoClient = require("mongodb").MongoClient;
const url = "mongodb+srv://user_01:user_01_p@cluster0.b565f.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const emailVerifier = require("verifier-node");
const nodemailer = require("nodemailer");

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
            form.parse(req, async function (err, fields, files) {
                if (err) {console.log(err);}
            
                // verifying email
                let apiResult = null;
                await emailVerifier.verify(fields['email'], "2b1e810090b21cab8a8753ec6bd1f091c63126345e15fb9a616a041ac48c68976dcce52db8c416c9fa5c8291fa4d3b56")
                .then(async function (response) {
                    apiResult = await response.valid();
                })
                .catch(err => {
                    console.log('error', err)
                });

                if (apiResult) {
                    console.log("Email passed verification, adding venue to database!");
                    MongoClient.connect(url, { useUnifiedTopology: false }, async function (err, db) {
                        if (err) {console.log(err);}
                        
                        let dbo = db.db("Venues");
                        let collection = dbo.collection("Restaurants");

                        await collection.insertOne({
                            name          : fields["name"],
                            email         : fields["email"],
                            streetAddress : fields["streetAddress"],
                            cityState     : fields["cityState"],
                            zipCode       : fields["zipCode"],
                            minCapacity   : fields["minCapacity"],
                            maxCapacity   : fields["maxCapacity"],
                            flatFee       : fields["flatFee"],
                            website       : fields["website"],
                            bookedDates   : []
                        });

                        db.close();
                    });

                    let index = "index.html";
                    fs.readFile(index, function (err, txt) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.write(txt);
                        res.write("<script>alert('Thank you for adding your venue!')</script>");
                        res.end();
                    });
                }
                else {
                    console.log("Email did not pass verification");
                    let venue = "venue_form.html";
                    fs.readFile(venue, function (err, txt) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.write(txt);
                        res.write("<script>alert('Your email did not pass verification, please try again')</script>")
                        res.end();
                    });
                }
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
    else if (req.url == "/browse_venues") {
        // browse venues page
        console.log("requesting browsing venues");

        if (req.method.toLowerCase() == "post") {
            // city has been selected
            var form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
                if (err) {console.log(err);}

                MongoClient.connect(url, { useUnifiedTopology: false }, async function (err, db) {
                    if (err) {console.log(err);}
                    
                    let dbo = db.db("Venues");
                    let collection = dbo.collection("Restaurants");
                    let results, content = "<div class='results'>";

                    if (fields["city"] == "all") {
                        results = await collection.find({},
                                                        {_id: 0}).toArray();
                    } else {
                        results = await collection.find({cityState: fields["city"]},
                                                  {_id: 0}).toArray();;
                    }

                    for (i = 0; i < results.length; i++) {
                        content += `<h3>Name: ${results[i]["name"]}</h3>`;
                        content += `<div>Address: ${results[i]["streetAddress"]} ${results[i]["cityState"]} ${results[i]["zipCode"]}</div>`;
                        content += `<div>Minimum Capacity: ${results[i]["minCapacity"]}</div>`;
                        content += `<div>Maximum Capacity: ${results[i]["maxCapacity"]}</div>`;
                        content += `<div>Flat Fee: $${results[i]["flatFee"]}</div>`;
                        content += `<div>Venue Website: ${results[i]["website"]}</div>`;
                        content += "<br>";
                    }

                    results += "</div>";

                    let browse = "city_form.html";
                    fs.readFile(browse, function (err, txt) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.write(txt);
                        res.write(content);
                        res.end();
                    });

                    db.close();
                });

            });
        }
        else {
            // form was not submitted
            let browse = "city_form.html";
            fs.readFile(browse, function (err, txt) {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.write(txt);
                res.end();
            });
        }
    }
    else if (req.url == "/booking") {
        // booking page
        console.log("requesting booking");
        let booking = "booking_form.html";

        if (req.method.toLowerCase() == "post") {
            // customer inquery form submitted
            var form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
                if (err) {console.log(err);}
            
                MongoClient.connect(url, { useUnifiedTopology: false }, async function (err, db) {
                    if (err) {console.log(err);}
                    
                    let dbo = db.db("Venues");
                    let collection = dbo.collection("Restaurants");

                    let venue = await collection.find({name : fields["Venue"]}).toArray();
                    
                    // verifying venue name
                    if (venue.length == 0) {
                        console.log("Booking venue name does not exist");
                        
                        fs.readFile(booking, function (err, txt) {
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.write(txt);
                            res.write(`<script>alert('${fields["Venue"]} is not one of our partnered venues, please try again.');</script>`);
                            res.end();
                        });
                        return;
                    }
                    
                    venue = venue[0];

                    // verifying event date
                    let dateVerified = true;

                    for (i = 0; i < await venue["bookedDates"].length; i++) {
                        if (venue["bookedDates"][i] == fields["EventDate"]){
                            dateVerified = false;
                            break
                        }
                    }

                    if (!dateVerified) {
                        console.log("booking date verified to false");

                        fs.readFile(booking, function (err, txt) {
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.write(txt);
                            res.write(`<script>alert('${fields["Venue"]} is not available for ${fields["EventDate"]}, please select a different date.');</script>`);
                            res.end();
                        });
                        return;
                    }

                    // verifying capacity
                    if (fields["expectedCapacity"] < venue["minCapacity"] || fields["expectedCapacity"] > venue["maxCapacity"]) {
                        console.log("Booking capacity goes out of range");
                        
                        fs.readFile(booking, function (err, txt) {
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.write(txt);
                            res.write(`<script>alert('${fields["expectedCapacity"]} is outside the capacity range for ${fields["Venue"]}, please try again.');</script>`);
                            res.end();
                        });
                        return;
                    }
                        
                    // verifying email
                    let apiResult = null;
                    await emailVerifier.verify(fields['Email'], "2b1e810090b21cab8a8753ec6bd1f091c63126345e15fb9a616a041ac48c68976dcce52db8c416c9fa5c8291fa4d3b56")
                    .then(async function (response) {
                        apiResult = await response.valid();
                    })
                    .catch(err => {
                        console.log('error', err)
                    });

                    if (!apiResult) {

                        console.log("Booking email did not pass verification");

                        fs.readFile(booking, function (err, txt) {
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            res.write(txt);
                            res.write("<script>alert('Your email did not pass verification, please try again');</script>")
                            res.end();
                        });
                        return;
                    }

                    // both email and date are verified 
                    console.log("venue, email, and date both verified!");
                    
                    await collection.updateOne({name : fields["Venue"]},
                                            {$push: {bookedDates: fields["EventDate"]}});

                    // sending confirmation email
                    let transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: "SteerMyEvent@gmail.com",
                            pass: "rbwyrutayfmtzxsr"
                        }
                    });

                    let message = `Hello ${fields["Name"]}, \n`;
                    message += "Thank you for your booking!\nBelow are the details of your booking:\n\n";
                    message += `Venue: ${fields["Venue"]}\n`;
                    message += `Date: ${fields["EventDate"]}\n`;
                    message += `Expected Capacity: ${fields["expectedCapacity"]}\n\n`;
                    message += "Please feel free to email us back with any questions!\n";
                    message += "Best,\nThe SteerMyEvent Team"


                    let mailOptions = {
                        from    : "SteerMyEvent@gmail.com",
                        to      : fields["Email"],
                        subject : "Your SteerMyEvent Booking",
                        text    : message 
                    };

                    transporter.sendMail(mailOptions, function (err, info){
                        if (err) {console.log(err);}
                        else {console.log("Email sent: ", info.response);}
                    });
                
                    fs.readFile(booking, function (err, txt) {
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.write(txt);
                        res.write(`<script>alert('Thank you for your booking! You will receive an email confirmation shortly');</script>`);
                        res.end();
                    });

                    db.close();
                });
            });
        }
        else {
            // form was not submitted
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





















