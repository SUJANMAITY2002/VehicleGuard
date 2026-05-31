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


import InwardOutwardNote from "../pages/Manufacturing/Inventory/InwardOutwardNote/InwardOutwardNote";
// import GINDetail             from "../pages/Manufacturing/Inventory/InwardOutwardNote/GINDetail";
import GINDetail from "../pages/Manufacturing/Inventory/InwardOutwardNote/GINDetail";
import GoodsReceiptNote      from "../pages/Manufacturing/Inventory/GoodsReceiptNote/GoodsReceiptNote";
import DirectGRN             from "../pages/Manufacturing/Inventory/DirectGRN/DirectGRN";
import ItemInventory         from "../pages/Manufacturing/Inventory/ItemInventory/ItemInventory";
import CreateGoodsInwardNote from "../pages/Manufacturing/Inventory/CreateInventory/CreateGIN";
import Transaction           from "../pages/Manufacturing/Masters/Transaction/Transaction";
import CreateTransaction     from "../pages/Manufacturing/Masters/Transaction/CreateTransaction";
import DocumentSequence      from "../pages/Manufacturing/Masters/DocumentSequence/DocumentSequence";
import CreateDocumentSequence from "../pages/Manufacturing/Masters/DocumentSequence/CreateDocumentSequence/CreateDocumentSequence";
import WeighmentSearch        from "../pages/Manufacturing/Inventory/Weighment/WeighmentSearch";
import WeighmentDetail from "../pages/Manufacturing/Inventory/Weighment/WeighmentDetail/WeighmentDetail";
import CreateWeighment        from "../pages/Manufacturing/Inventory/Weighment/CreateWeighment/CreateWeighment";
import CreateInwardWeighment  from "../pages/Manufacturing/Inventory/Weighment/CreateWeighment/Createinwardweighment";
import CreateOutwardWeighment from "../pages/Manufacturing/Inventory/Weighment/CreateWeighment/Createoutwardweighment";

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
      <Route path="/procurement"   element={<Procurement />} />
      <Route path="/inventory"     element={<Inventory />} />
      <Route path="/production"    element={<Production />} />
      <Route path="/sales"         element={<Sales />} />
      <Route path="/masters"       element={<Masters />} />

      {/* GOODS INWARD NOTE */}
      <Route path="/inward-outward-note"        element={<InwardOutwardNote />} />
      <Route path="/gin-detail/:id"           element={<GINDetail />} />
      <Route path="/create-goods-inward-note" element={<CreateGoodsInwardNote />} />

      {/* OTHER INVENTORY */}
      <Route path="/goods-receipt-note" element={<GoodsReceiptNote />} />
      <Route path="/direct-grn"         element={<DirectGRN />} />
      <Route path="/item-inventory"     element={<ItemInventory />} />

      {/* WEIGHMENT */}
      <Route path="/weighment-search"         element={<WeighmentSearch />} />
      <Route path="/weighment-detail/:id"     element={<WeighmentDetail />} />
      <Route path="/create-weighment"         element={<CreateWeighment />} />
      <Route path="/create-inward-weighment"  element={<CreateInwardWeighment />} />
      <Route path="/create-outward-weighment" element={<CreateOutwardWeighment />} />

      {/* MASTERS */}
      <Route path="/document-sequence"        element={<DocumentSequence />} />
      <Route path="/create-document-sequence" element={<CreateDocumentSequence />} />
      <Route path="/transaction-module"       element={<Transaction />} />
      <Route path="/create-transaction"       element={<CreateTransaction />} />

    </Routes>
  );
};

export default AppRoutes;