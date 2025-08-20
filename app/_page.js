"use client";

import React, { useState, useEffect, useRef } from "react";
import { JSONTree } from "react-json-tree";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function App() {
  const [url, setUrl] = useState(
    "http://numbersapi.com/random/math?jsonTTTTTTTT" // <-- random API
  );
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [timeSeries, setTimeSeries] = useState({});
  const intervalRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("selectedItems");
    if (saved) setSelected(new Set(JSON.parse(saved)));

    const storedSeries = localStorage.getItem("timeSeries");
    if (storedSeries) setTimeSeries(JSON.parse(storedSeries));
  }, []);

  // Save selections
  useEffect(() => {
    localStorage.setItem("selectedItems", JSON.stringify([...selected]));
  }, [selected]);

  const fetchData = async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const json = await res.json();
      setData(json);

      // Update time series
      const stored = JSON.parse(localStorage.getItem("timeSeries") || "{}");
      selected.forEach((path) => {
        const keys = path.split(".").filter((k) => k !== "root");
        const value = keys.reduce(
          (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
          json
        );

        if (!stored[path]) stored[path] = [];
        stored[path].push({
          timestamp: new Date().toLocaleTimeString(),
          value,
        });

        // 🔑 Normalize values in this series
        const numericValues = stored[path]
          .map((d) => {
            const n = Number(d.value);
            return isNaN(n) ? null : n;
          })
          .filter((v) => v !== null);

        if (numericValues.length > 0) {
          const max = Math.max(...numericValues);
          if (max > 0) {
            stored[path] = stored[path].map((d) => {
              const n = Number(d.value);
              return {
                ...d,
                normValue: !isNaN(n) ? n / max : undefined,
              };
            });
          }
        }
      });

      localStorage.setItem("timeSeries", JSON.stringify(stored));
      setTimeSeries(stored);
    } catch (e) {
      console.error("Error fetching JSON:", e);
      setData({ error: e.message });
    }
  };

  // Auto-fetch every 30s
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 3000);
    return () => clearInterval(intervalRef.current);
  }, [url, selected]);

  const handleClick = (path) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) newSet.delete(path);
      else newSet.add(path);
      return newSet;
    });
  };

  const valueRenderer = (raw, value, ...keyPath) => {
    const path = keyPath.reverse().join(".");
    const isSelected = selected.has(path);
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          handleClick(path);
        }}
        style={{
          cursor: "pointer",
          backgroundColor: isSelected ? "#cce5ff" : "transparent",
          padding: "2px 4px",
          borderRadius: "3px",
        }}
      >
        {raw}
      </span>
    );
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>JSON Viewer with Time Series</h2>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "600px", marginRight: "10px" }}
      />
      <button onClick={fetchData}>Fetch Now</button>

      <div style={{ marginTop: "20px" }}>
        {data ? (
          <JSONTree
            data={data}
            hideRoot={false}
            valueRenderer={valueRenderer}
          />
        ) : (
          <p>No data loaded yet. Click "Fetch Now".</p>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Selected Keys</h3>
        <ul>
          {[...selected].map((path) => (
            <li key={path}>{path}</li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Saved Values (Time Series)</h3>
        {Object.keys(timeSeries).length === 0 ? (
          <p>No values tracked yet.</p>
        ) : (
          Object.entries(timeSeries).map(([path, entries]) => (
            <div key={path} style={{ marginBottom: "30px" }}>
              <strong>{path}</strong>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={entries}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="normValue"
                    stroke="#82ca9d"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <ul>
                {entries.map((entry, idx) => (
                  <li key={idx}>
                    {entry.timestamp} → raw: {String(entry.value)} | norm:{" "}
                    {entry.normValue !== undefined
                      ? entry.normValue.toFixed(3)
                      : "n/a"}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
