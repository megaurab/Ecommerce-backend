import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "",
  password: "",
  port: 1111,
});
db.connect();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: "secret" }));

function isProductInCart(cart, id) {
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id == id) {
      return true;
    }
  }

  return false;
}

function calculateTotal(cart, req) {
  total = 0;
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].sale_price) {
      total = total + (cart[i].sale_price * cart[i].quantity);
    } else {
      total = total + (cart[i].price * cart[i].quantity);
    }
  }

  req.session.total = total;
  return total;
}


app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products");
    res.render("index", { result: result.rows });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Error fetching products");
  }
});

app.post("/add_to_cart", (req, res) => {
  var id = req.body.id;
  var name = req.body.name;
  var price = req.body.price;
  var sale_price = req.body.sale_price;
  var quantity = req.body.quantity;
  var image = req.body.image;
  var product = { id: id, name: name, price: price, sale_price: sale_price, quantity: quantity, image: image }

  if (req.session.cart) {
    var cart = req.session.cart;

    if (!isProductInCart(cart, id)) {
      cart.push(product);
    }
  } else {
    req.session.cart = [product];
    var cart = req.session.cart;
  }

  calculateTotal(cart, req);

  res.redirect('/cart');
})

app.get("/cart", (req, res) => {
  var cart = req.session.cart;
  var total = req.session.total;

  res.render('cart', { cart: cart, total: total });
});

app.post('/remove_product', (req, res) => {
  var id = req.body.id;
  var cart = req.session.cart;

  for (let i = 0; i < cart.length; i++) {
    if (cart[i].id == id) {
      cart.splice(cart.indexOf(i), 1);
    }
  }

  calculateTotal(cart, req);
  res.redirect("/cart");
})



app.post('/edit_product_quantity', (req, res) => {
  var id = req.body.id;
  var quantity = req.body.quantity;
  var increase_btn = req.body.increase_product_quantity;
  var decrease_btn = req.body.decrease_product_quantity;

  var cart = req.session.cart;

  if (increase_btn) {
    for (let i = 0; i < cart.length; i++) {

      if (cart[i].id == id) {
        if (cart[i].quantity > 0) {
          cart[i].quantity = parseInt(cart[i].quantity) + 1;
        }
      }
    }
  }

  if (decrease_btn) {
    for (let i = 0; i < cart.length; i++) {

      if (cart[i].id == id) {
        if (cart[i].quantity > 1) {
          cart[i].quantity = parseInt(cart[i].quantity) - 1;
        }
      }
    }
  }

  calculateTotal(cart, req);
  res.redirect('/cart');
})

app.get('/checkout',(req,res)=>{
  var total = req.session.total;
  res.render('checkout',{total:total});
})

app.post('/place_order',async(req,res)=>{
  var name = req.body.name;
  var email = req.body.email;
  var phone = req.body.phone;
  var city = req.body.city;
  var address = req.body.address;
  var cost = req.session.total;
  var status = "not paid";
  var date = new Date();
  var products_ids="";

  var cart = req.session.cart;
  for(let i = 0; i<cart.length ; i++){
    products_ids = products_ids +","+cart[i].id;
  }

  try {
    await db.query('INSERT INTO orders(cost, name, email, status, city, address, phone, date, products_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [total, name, email, status, city, address, phone, date, products_ids]);
    res.redirect('/payment');
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Error placing order");
  }
})

app.get('/payment',(req,res)=>{
  res.render('payment');
})

app.listen(port, () => {
  console.log("App is running on port 3000");
})