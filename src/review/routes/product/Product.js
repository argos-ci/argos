import React from 'react';
import { Link } from 'react-router';

function Product() {
  return (
    <div>
      <h2>Product</h2>
      <Link to="/profile/1">
        Sign Up
      </Link>
      <br />
      <Link to="/profile/1">
        Sign in with GitHub
      </Link>
    </div>
  );
}

export default Product;
