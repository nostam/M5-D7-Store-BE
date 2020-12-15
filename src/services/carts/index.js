const express = require("express");
const uniqid = require("uniqid");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { writeDB, readDB } = require("../../lib");
const { join } = require("path");

const cartsJson = join(__dirname, "carts.json");
const productsJson = join(__dirname, "../products/products.json");

//TODO : build a function to regen cart to FE for post and delete aswell
const err = (msg) => {
  const e = new Error();
  e.message = "msg";
  e.httpStatusCode = 404;
  return next(e);
};

router.get("/:cartID", async (req, res, next) => {
  try {
    const carts = await readDB(cartsJson);
    const db = await readDB(productsJson);
    if (carts.length > 0) {
      const cart = carts.find((entry) => entry._id === req.params.cartID);
      if (Object.keys(cart).length > 0) {
        cart.products = cart.products.map((product) =>
          db.find((entry) => entry._id === product._id)
        );
        cart.total = cart.products.reduce((acc, cv) => {
          return acc + cv.price;
        }, 0);
        res.send(cart);
      } else {
        err("invalid user");
      }
    } else {
      throw Error();
    }
  } catch (error) {
    next(error);
  }
});

router.post("/:cartID/add-to-cart/:productID", async (req, res, next) => {
  try {
    const db = await readDB(cartsJson);
    const cart = db.find((entry) => entry._id === req.params.cartID);
    const cartIndex = db.findIndex((entry) => entry._id === req.params.cartID);
    if (cartIndex !== -1) {
      const products = await readDB(productsJson);
      const product = products.find(
        (product) => product._id === req.params.productID
      );
      if (Object.keys(product).length <= 0) {
        err("invalid product ID");
      } else {
        cart.products.push({ _id: product._id });
        cart.total = cart.products.length;
        const updatedDB = [
          ...db.slice(0, cartIndex),
          { ...cart },
          ...db.slice(cartIndex + 1),
        ];
        await writeDB(updatedDB, cartsJson);
        res.status(201).send();
      }
    } else {
      err("invalid user");
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete(
  "/:cartID/remove-from-cart/:productID",
  async (req, res, next) => {
    try {
      const db = await readDB(cartsJson);
      const cart = db.find((entry) => entry._id === req.params.cartID);
      const cartIndex = db.findIndex(
        (entry) => entry._id === req.params.cartID
      );
      if (cartIndex !== -1) {
        const products = await readDB(productsJson);
        const product = products.find(
          (product) => product._id === req.params.productID
        );
        if (Object.keys(product).length < 0) {
          err("invalid product ID");
        } else {
          const quantity = cart.products.filter(
            (product) => product._id === req.params.productID
          );
          const newProduct = cart.products.filter(
            (product) => product._id !== req.params.productID
          );
          if (quantity.length > 1) {
            newProduct.push(quantity.pop());
          }
          const updatedCart = { ...cart, products: newProduct };
          updatedCart.total = updatedCart.products.length;
          const updatedDB = [
            ...db.slice(0, cartIndex),
            { ...updatedCart },
            ...db.slice(cartIndex + 1),
          ];
          await writeDB(updatedDB, cartsJson);
          res.status(200).send();
        }
      } else {
        err("invalid user");
      }
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
