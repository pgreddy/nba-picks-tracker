var express = require('express');
var router = express.Router();
var path = require('path');
var csv = require('csv-parser')
var fs = require('fs')

// Connect string to MySQL
var keyvaluestore = require('../models/keyvaluestore.js');
var kvs_users = new keyvaluestore('users_450');
kvs_users.init(function(err, data){});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render("../views/main.ejs", {
    error: req.session.error
  });
  req.session.error = null;
});
router.post('/checklogin', function(req, res) {
    kvs_users.get(req.body.username, function(err, data) {
      // error in lookup
      if (err) {
        // go back to login page and display error
        req.session.error = err;
        res.redirect('/');
      // user not found
      } else if (data == null) {
        // go back to login page and display error
        // req.flash('error', 'User not found');
        req.session.error = 'User not found';
        res.redirect('/');
      // successful login
      } else if (JSON.parse(data[0].value).password == req.body.password) {
        req.session.username = req.body.username;
        res.redirect('/home');
      // incorrect password
      } else {
        // go back to login page and display error
        req.session.error = 'Incorrect username or password';
        res.redirect('/');
      }
    })
});
router.post('/bookmark', function(req, res) {
    kvs_users.get(req.session.username, function(err, data) {
      // error in lookup
      if (err) {
        req.session.error = err;
        res.redirect('/scatter');
      } else {
        var value = JSON.parse(data[0].value);
        var inx = data[0].inx;
        value.stored.push(req.body.data);
        kvs_users.update(req.session.username, inx, value, function (err, data) {
            if (err) {
                req.session.error = err;
                console.log(err);
                res.redirect('/scatter');
            }
            res.redirect('/scatter');
        });
      }
    })
});
router.get('/home', function(req, res) {
  if (!req.session.username) {
      res.redirect('/');
      return;
  }
  kvs_users.get(req.session.username, function (err, data) {
      var value = JSON.parse(data[0].value);
      res.render("../views/home.ejs", {
        username: req.session.username,
        countries: value.countries,
        stored: value.stored
      });
  });
});
router.get('/signup', function(req, res) {
    if (req.session.countries) {
        res.render('signup.ejs', {countries: req.session.countries, error: req.session.error});
        req.session.error = null;
        return;
    }
    var query = "SELECT inequality.country" +
                " FROM fifa" +
                " JOIN inequality ON fifa.country=inequality.country" +
                " JOIN jobs ON inequality.country=jobs.country" +
                " JOIN population ON jobs.country=population.country" +
                " JOIN social_usage ON population.country=social_usage.country";
    connection.query(query, function(err, data) {
        if (err) console.log(err);
        else {
            res.render('signup.ejs', {countries: data, error: req.session.error});
            req.session.error = null;
            req.session.countries = data;
        }
      });
});
router.post('/createaccount', function(req, res) {
    kvs_users.get(req.body.username, function (err, data) {
        if (err) {
            req.session.error = err;
            console.log(err);
            res.redirect('/signup');
        } else if (data != null) {
            req.session.error = "User already exists";
            res.redirect('/signup');
        } else {
            kvs_users.put(req.body.username, JSON.stringify({
                password: req.body.password,
                countries: req.body.countries,
                stored: []
              }), function(err, data){
                if (err) {
                    req.session.error = err;
                    res.redirect('/signup');
                } else {
                    req.session.username = req.body.username;
                    res.redirect('/home');
                }
            });
        }
    });
});
router.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});
router.post('/choose_country', async function(req, res) {
  var country = req.body.country;
  var query = 'SELECT * FROM inequality WHERE country = "' + country + '"';
  await connection.query(query, function(err, data) {
      if (err) console.log(err);
      else {
        res.send(data);
      }
    });
});
router.post('/choose_variables', async function(req, res) {
  var x_table = req.body.x_table;
  var x_column = req.body.x_column;
  var y_table = req.body.y_table;
  var y_column = req.body.y_column;
  var x_data = undefined;
  var y_data = undefined;
  var query = 'SELECT D1.' + x_column + ' AS x, D2.' + y_column + ' AS y, D1.country AS country' +
    ' FROM ' + x_table + ' D1 INNER JOIN ' + y_table + ' D2 ON D1.country = D2.country' +
    ' WHERE D1.' + x_column + '> 0 AND D2.' + y_column + '> 0;';
  await connection.query(query, function(err, data) {
      if (err) console.log(err);
      else {
        res.send(data);
      }
    });

});
router.get('/multiple_select', async function(req, res, next) {
  var countries = undefined;


  if (req.session.countries) {
      countries = req.session.countries;
      res.render("../views/multiple_select.ejs", {
        countries: countries
      });
  } else {
      var query = "SELECT inequality.country" +
                  " FROM fifa" +
                  " JOIN inequality ON fifa.country=inequality.country" +
                  " JOIN jobs ON inequality.country=jobs.country" +
                  " JOIN population ON jobs.country=population.country" +
                  " JOIN social_usage ON population.country=social_usage.country";
      await connection.query(query, function(err, data) {
          if (err) console.log(err);
          else {
            req.session.countries = data;
            countries = data;
            res.render("../views/multiple_select.ejs", {
              countries: countries
            });
          }
        });
  }
});

router.get('/scatter', async function(req, res, next) {
  var username = req.session.username;
  var countries = undefined;

  if (req.session.countries) {
      countries = req.session.countries;
      res.render("../views/scatter.ejs", {
        countries: countries,
        username: username
      });
  } else {
      var query = "SELECT inequality.country" +
                  " FROM fifa" +
                  " JOIN inequality ON fifa.country=inequality.country" +
                  " JOIN jobs ON inequality.country=jobs.country" +
                  " JOIN population ON jobs.country=population.country" +
                  " JOIN social_usage ON population.country=social_usage.country";
      await connection.query(query, function(err, data) {
          if (err) console.log(err);
          else {
            req.session.countries = data;
            countries = data;
            res.render("../views/scatter.ejs", {
              countries: countries,
              username: username
            });
          }
        });
  }
});
router.get('/alldata', function(req, res, next) {
  res.sendFile(path.join(__dirname, '../', 'views', 'alldata.html'));
});


router.post('/multiple_post', function(req, res) {
    var countries = req.body["countries[]"];
    var columns = req.body["columns[]"];
    var columns_query = columns[0];
    var avg = {};
    if (typeof columns == "string") {
      columns_query = columns;
      connection.query("SELECT AVG("+columns+") AS " + columns + " FROM fifa" +
      " JOIN inequality ON fifa.country=inequality.country" +
      " JOIN jobs ON inequality.country=jobs.country" +
      " JOIN population ON jobs.country=population.country" +
      " JOIN social_usage ON population.country=social_usage.country" +
      " WHERE " + columns + " <> -1", function(err, data) {
        if (err) console.log(err);
        else {
            avg[columns] = data[0][columns];
        }
      });
    } else {
      for (var i = 0; i < columns.length; i++) {
        if (i > 0) {
            columns_query += ", " + columns[i];
        }
        const curr_col = columns[i];
        connection.query("SELECT AVG("+curr_col+") AS " + curr_col + " FROM fifa" +
        " JOIN inequality ON fifa.country=inequality.country" +
        " JOIN jobs ON inequality.country=jobs.country" +
        " JOIN population ON jobs.country=population.country" +
        " JOIN social_usage ON population.country=social_usage.country" +
        " WHERE " + curr_col + " <> -1", function(err, data) {
          if (err) console.log(err);
          else {
              avg[curr_col] = data[0][curr_col];
          }
        });
      }
    }
    var countries_query = "('" + countries[0];
    if (typeof countries == "string") {
      countries_query = "('" + countries;
    } else {
      for (var i = 1; i < countries.length; i++) {
        countries_query += "', '" + countries[i];
      }
    }
    countries_query += "')";
    var query = "SELECT inequality.country, " + columns_query +
                " FROM fifa" +
                " JOIN inequality ON fifa.country=inequality.country" +
                " JOIN jobs ON inequality.country=jobs.country" +
                " JOIN population ON jobs.country=population.country" +
                " JOIN social_usage ON population.country=social_usage.country" +
                " WHERE inequality.country IN " + countries_query;
    connection.query(query, function(err, data) {
      if (err) console.log(err);
      else {
          var result = {data: data, avg: JSON.stringify(avg)};
          res.send(result);
      }
    });
});


router.get('/import', async function(req,res) {
  // Use the import button to import things into the database
  // Import inequality table
  var query1a = 'DROP TABLE inequality';
  var query1b = 'CREATE TABLE inequality ( country VARCHAR(255) NOT NULL, gini DECIMAL(12,2), top_20_inc_share DECIMAL(12,2), bot_20_inc_share DECIMAL(12,2), num_of_poor DECIMAL(12,2), PRIMARY KEY (country) )';

  await connection.query(query1a, function(err, rows, fields) {
    if (err) console.log(err);
    else {
      connection.query(query1b, function(err, rows, fields) {
        if (err) console.log(err);
        else {
          fs.createReadStream('data/inequality.csv')
            .pipe(csv())
            .on('data', function (data) {
              query = "INSERT INTO inequality (country, gini, top_20_inc_share, bot_20_inc_share, num_of_poor) VALUES (" + '"' + data.country + '"' + ",IF(" + '"' + data.gini + '"' + '="..", -1,' + '"' + data.gini + '"' + "),IF(" + '"' + data.top_20_inc_share + '"' + '="..", -1,' + '"' + data.top_20_inc_share + '"' + "),IF(" + '"' + data.bot_20_inc_share + '"' + '="..", -1,' + '"' + data.bot_20_inc_share + '"' + "),IF(" + '"' + data.num_of_poor + '"' + '="..", -1,' + '"' + data.num_of_poor + '"' + "));";
              connection.query(query, function(err, rows, fields) {
                if (err) console.log(err);
                else {
                  //res.json(rows);
                }
              });
            });
        }
      });
    }
  });

  // Import jobs table
  var query2a = 'DROP TABLE jobs';
  var query2b = 'CREATE TABLE jobs ( country VARCHAR(255) NOT NULL, self_employed_proportion DECIMAL(12,2), total_employment DECIMAL(12,2), unemployment_rate DECIMAL(12,2), salaried_workers DECIMAL(12,2), PRIMARY KEY (country) )';

  await connection.query(query2a, function(err, rows, fields) {
    if (err) console.log(err);
    else {
      connection.query(query2b, function(err, rows, fields) {
        if (err) console.log(err);
        else {
          fs.createReadStream('data/jobs.csv')
            .pipe(csv())
            .on('data', function (data) {
              query = "INSERT INTO jobs (country, self_employed_proportion, total_employment, unemployment_rate, salaried_workers) VALUES (" + '"' + data.country + '"' + ",IF(" + '"' + data.self_employed_proportion + '"' + '="..", -1,' + '"' + data.self_employed_proportion + '"' + "),IF(" + '"' + data.total_employment + '"' + '="..", -1,' + '"' + data.total_employment + '"' + "),IF(" + '"' + data.unemployment_rate + '"' + '="..", -1,' + '"' + data.unemployment_rate + '"' + "),IF(" + '"' + data.salaried_workers + '"' + '="..", -1,' + '"' + data.salaried_workers + '"' + "));";
              connection.query(query, function(err, rows, fields) {
                if (err) console.log(err);
                else {
                  //res.json(rows);
                }
              });
            });
        }
      });
    }
  });


  // Import cousin marriage
  var query3a = 'DROP TABLE cousin_marriage';
  var query3b = 'CREATE TABLE cousin_marriage ( country VARCHAR(255) NOT NULL, percent DECIMAL(12,2), PRIMARY KEY (country) )';

  await connection.query(query3a, function(err, rows, fields) {
    if (err) console.log(err);
    else {
      connection.query(query3b, function(err, rows, fields) {
        if (err) console.log(err);
        else {
          fs.createReadStream('data/cousin-marriage-data.csv')
            .pipe(csv())
            .on('data', function (data) {
              query = "INSERT INTO cousin_marriage (country, percent) VALUES (" + '"' + data.country + '"' + ",IF(" + '"' + data.percent + '"' + '="..", -1,' + '"' + data.percent + '"' + "));";
              connection.query(query, function(err, rows, fields) {
                if (err) console.log(err);
                else {
                  //res.json(rows);
                }
              });
            });
        }
      });
    }
  });

  // Import fifa
  var query4a = 'DROP TABLE fifa';
  var query4b = 'CREATE TABLE fifa ( country VARCHAR(255) NOT NULL, confederation VARCHAR(255), population_share DECIMAL(12,2), tv_audience_share DECIMAL(12,2), gdp_weighted_share DECIMAL(12,2), PRIMARY KEY (country) )';

  await connection.query(query4a, function(err, rows, fields) {
    if (err) console.log(err);
    else {
      connection.query(query4b, function(err, rows, fields) {
        if (err) console.log(err);
        else {
          fs.createReadStream('data/fifa_countries_audience.csv')
            .pipe(csv())
            .on('data', function (data) {
              query = "INSERT INTO fifa (country, confederation, population_share, tv_audience_share, gdp_weighted_share) VALUES (" + '"' + data.country + '"' + ",IF(" + '"' + data.confederation + '"' + '="..", -1,' + '"' + data.confederation + '"' + "),IF(" + '"' + data.population_share + '"' + '="..", -1,' + '"' + data.population_share + '"' + "),IF(" + '"' + data.tv_audience_share + '"' + '="..", -1,' + '"' + data.tv_audience_share + '"' + "),IF(" + '"' + data.gdp_weighted_share + '"' + '="..", -1,' + '"' + data.gdp_weighted_share + '"' + "));";
              connection.query(query, function(err, rows, fields) {
                if (err) console.log(err);
                else {
                  //res.json(rows);
                }
              });
            });
        }
      });
    }
  });

  // Import population
  var query5a = 'DROP TABLE population';
  var query5b = 'CREATE TABLE population ( country VARCHAR(255) NOT NULL, life_expectancy DECIMAL(12,2), total_population DECIMAL(12,2), urban_population DECIMAL(12,2), rural_population DECIMAL(12,2), PRIMARY KEY (country) )';

  await connection.query(query5a, function(err, rows, fields) {
    if (err) console.log(err);
    else {
      connection.query(query5b, function(err, rows, fields) {
        if (err) console.log(err);
        else {
          fs.createReadStream('data/population.csv')
            .pipe(csv())
            .on('data', function (data) {
              query = "INSERT INTO population (country, life_expectancy, total_population, urban_population, rural_population) VALUES (" + '"' + data.country + '"' + ",IF(" + '"' + data.life_expectancy + '"' + '="..", -1,' + '"' + data.life_expectancy + '"' + "),IF(" + '"' + data.total_population + '"' + '="..", -1,' + '"' + data.total_population + '"' + "),IF(" + '"' + data.urban_population + '"' + '="..", -1,' + '"' + data.urban_population + '"' + "),IF(" + '"' + data.rural_population + '"' + '="..", -1,' + '"' + data.rural_population + '"' + "));";
              connection.query(query, function(err, rows, fields) {
                if (err) console.log(err);
                else {
                  //res.json(rows);
                }
              });
            });
        }
      });
    }
  });

  // Import social usage
  var query6a = 'DROP TABLE social_usage';
  var query6b = 'CREATE TABLE social_usage ( country VARCHAR(255) NOT NULL, electricity_access DECIMAL(12,2), fertility_rate DECIMAL(12,2), literacy_rate DECIMAL(12,2), cellular_subscriptions DECIMAL(12,2), internet_usage DECIMAL(12,2), PRIMARY KEY (country) )';

  connection.query(query6a, function(err, rows, fields) {
    if (err) console.log(err);
    else {
      connection.query(query6b, function(err, rows, fields) {
        if (err) console.log(err);
        else {
          fs.createReadStream('data/social_usage.csv')
            .pipe(csv())
            .on('data', function (data) {
              query = "INSERT INTO social_usage (country, electricity_access, fertility_rate, literacy_rate, cellular_subscriptions, internet_usage) VALUES (" + '"' + data.country + '"' + ",IF(" + '"' + data.electricity_access + '"' + '="..", -1,' + '"' + data.electricity_access + '"' + "),IF(" + '"' + data.fertility_rate + '"' + '="..", -1,' + '"' + data.fertility_rate + '"' + "),IF(" + '"' + data.literacy_rate + '"' + '="..", -1,' + '"' + data.literacy_rate + '"' + "),IF(" + '"' + data.cellular_subscriptions + '"' + '="..", -1,' + '"' + data.cellular_subscriptions + '"' + "),IF(" + '"' + data.internet_usage + '"' + '="..", -1,' + '"' + data.internet_usage + '"' + "));";
              connection.query(query, function(err, rows, fields) {
                if (err) console.log(err);
                else {
                  //res.json(rows);
                }
              });
            });
        }
      });
    }
  });
});
module.exports = router;
