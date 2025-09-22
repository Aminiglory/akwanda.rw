import React from "react";
import { FaBed,FaBuffer,FaPlane, FaTaxi } from "react-icons/fa6";

const Navbar = () => {
  return (
    <div className="w-full bg-blue-800 p-10 flex flex-col justify-between ">
      <div className="">
        <h2 className="font-bold text-2xl text-white">AKWANDA.rw</h2>
      </div>
      <div className="w-full flex mt-3.5 gap-3.5">
        <button className="rounded-full border border-white p-3 w-auto flex items-center justify-center gap-1.5">
            <FaBed className="text-white"/>
            <a href="" className="text-white">Stays</a>
        </button>
        <button className="rounded-full border border-white p-3 w-auto flex items-center justify-center gap-1.5">
            <FaPlane className="text-white"/>
            <a href="" className="text-white">Flights</a>
        </button>
        <button className="rounded-full border border-white p-3 w-auto flex items-center justify-center gap-1.5">
            <FaBuffer className="text-white"/>
            <a href="" className="text-white">Attraction</a>
        </button>
        <button className="rounded-full border border-white p-3 w-auto flex items-center justify-center gap-1.5">
            <FaTaxi className="text-white"/>
            <a href="" className="text-white">Airport taxis</a>
        </button>
      </div>
    </div>
  );
};

export default Navbar;
