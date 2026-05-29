import React from "react";

import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home/Home";

import Signin from "../pages/auth/Signin";
import Signup from "../pages/auth/Signup";

import Manufacturing from "../pages/Manufacturing/Manufacturing";
import Procurement from "../pages/Manufacturing/Procurement/Procurement";
import Inventory from "../pages/Manufacturing/Inventory/Inventory";
import Production from "../pages/Manufacturing/Production/Production";
import Sales from "../pages/Manufacturing/Sales/Sales";
import Masters from "../pages/Manufacturing/Masters/Masters";

import GoodsInwardNote from "../pages/Manufacturing/Inventory/GoodsInwardNote/GoodsInwardNote";
import GoodsReceiptNote from "../pages/Manufacturing/Inventory/GoodsReceiptNote/GoodsReceiptNote";
import DirectGRN from "../pages/Manufacturing/Inventory/DirectGRN/DirectGRN";
import ItemInventory from "../pages/Manufacturing/Inventory/ItemInventory/ItemInventory";
import CreateGoodsInwardNote from "../pages/Manufacturing/Inventory/CreateInventory/CreateGIN";
import Transaction from "../pages/Manufacturing/Masters/Transaction/Transaction";
import CreateTransaction from "../pages/Manufacturing/Masters/Transaction/CreateTransaction";
import DocumentSequence from "../pages/Manufacturing/Masters/DocumentSequence/DocumentSequence";
import CreateDocumentSequence from "../pages/Manufacturing/Masters/DocumentSequence/CreateDocumentSequence/CreateDocumentSequence";

const AppRoutes = () => {
  return (
    <Routes>

      {/* AUTH */}

      <Route path="/signin" element={<Signin />} />

      <Route path="/signup" element={<Signup />} />

      {/* HOME */}

      <Route path="/" element={<Home />} />

      {/* MODULE ROUTES */}
      <Route path="/manufacturing" element={<Manufacturing />} />

      <Route path="/procurement" element={<Procurement />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/production" element={<Production />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/masters" element={<Masters />} />


      <Route path="/goods-inward-note" element={<GoodsInwardNote />} />
      <Route path="/goods-receipt-note" element={<GoodsReceiptNote />} />
      <Route path="/direct-grn" element={<DirectGRN />} />
      <Route path="/item-inventory" element={<ItemInventory />} />
      <Route
        path="/create-goods-inward-note"
        element={<CreateGoodsInwardNote />}
      />
      <Route
        path="/document-sequence"
        element={<DocumentSequence />}
      />
      
       <Route
        path="/create-document-sequence"
        element={<CreateDocumentSequence />}
      />
      <Route path="/transaction-module" element={<Transaction />} />
      <Route path="/create-transaction" element={<CreateTransaction />} />
    </Routes>
  );
};

export default AppRoutes;