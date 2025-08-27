"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { useEffect, useRef, useState } from "react";
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
  const [url, setUrl] = useState("http://numbersapi.com/random/math?json");
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [timeSeries, setTimeSeries] = useState({});
  const intervalRef = useRef(null);
  const [interval, setIntervalValue] = useState(1000);
  const [isCopied, setIsCopied] = useState({});
  const [isFetching, setIsFetching] = useState(false);

  const handleStart = () => {
    setIsFetching(true);
    startFetching();
  };

  const handleStop = () => {
    setIsFetching(false);
    stopFetching();
  };

  const handleCopy = (path, entries) => {
    const text = JSON.stringify([...entries].reverse(), null, 2);

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied((prev) => ({ ...prev, [path]: true }));

      setTimeout(() => {
        setIsCopied((prev) => ({ ...prev, [path]: false }));
      }, 1000);
    });
  };

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

  useEffect(() => {
    fetchData();
  }, [url]);

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

        if (value !== undefined) {
          if (!stored[path]) stored[path] = [];
          stored[path].push({
            timestamp: new Date().toLocaleTimeString(),
            value,
          });
        }
      });

      localStorage.setItem("timeSeries", JSON.stringify(stored));
      setTimeSeries(stored);
    } catch (e) {
      console.error("Error fetching JSON:", e);
      setData({ error: e.message });
    }
  };

  const startFetching = () => {
    fetchData(); // fetch immediately
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (typeof interval === "number" && interval > 0) {
      intervalRef.current = setInterval(fetchData, interval);
    }
  };

  const stopFetching = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

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
        className={`cursor-pointer px-1 py-[2px] rounded ${
          isSelected ? "border border-green-400 bg-gray-950" : "bg-transparent"
        }`}
      >
        {raw}
      </span>
    );
  };

  const myTheme = {
    base00: "#1e1e1e",
    base01: "#2e2e2e",
    base02: "#3e3e3e",
    base03: "#999999",
    base04: "#cccccc",
    base05: "#ffffff",
    base06: "#ffffff",
    base07: "#ffffff",
    base08: "#f44747",
    base09: "#ff8800",
    base0A: "#ffcc66",
    base0B: "#99cc99",
    base0C: "#66cccc",
    base0D: "#6699cc",
    base0E: "#cc99cc",
    base0F: "#ffffff",
  };

  const deletePath = (path) => {
    // Remove from timeSeries
    const updatedSeries = { ...timeSeries };
    delete updatedSeries[path];
    setTimeSeries(updatedSeries);
    localStorage.setItem("timeSeries", JSON.stringify(updatedSeries));

    // Deselect
    setSelected((prev) => {
      const newSet = new Set(prev);
      newSet.delete(path);
      localStorage.setItem("selectedItems", JSON.stringify([...newSet]));
      return newSet;
    });
  };

  return (
    <div className="p-5">
      <div className="w-full flex gap-2 justify-start items-center pb-4">
        <label className="text-2xl font-bold  flex-1">URL</label>
        <Input
          className="flex-[3]"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="w-full flex gap-2 justify-start items-center pb-4">
        <label className="text-lg font-bold flex-1">Interval (ms)</label>
        <Input
          className="w-32 flex-[3]"
          type="number"
          value={interval ?? ""}
          onChange={(e) =>
            setIntervalValue(
              Number(e.target.value) < 100 ? 100 : Number(e.target.value)
            )
          }
        />
      </div>
      <div className="flex gap-2">
        {isFetching ? (
          <Button variant="destructive" onClick={handleStop}>
            Stop fetch
          </Button>
        ) : (
          <Button onClick={handleStart}>Start fetch</Button>
        )}
      </div>
      <div className="w-full flex gap-2 justify-start items-center mb-10">
        {data ? (
          <div className="w-full min-h-[350px] overflow-auto">
            <JSONTree
              data={data}
              hideRoot={false}
              valueRenderer={valueRenderer}
              theme={myTheme}
              invertTheme={false}
            />
          </div>
        ) : (
          <p>No data loaded yet. Click "Start fetch".</p>
        )}
      </div>
      <div className="w-full flex-col gap-2 justify-start items-center pb-4">
        {Object.keys(timeSeries).length === 0 ? (
          <p>No values tracked yet.</p>
        ) : (
          Object.entries(timeSeries).map(([path, entries]) => {
            const numericEntries = entries.filter(
              (entry) => typeof entry.value === "number" && !isNaN(entry.value)
            );

            return (
              <Collapsible key={path}>
                <Card key={path} className="my-5">
                  <CardHeader>
                    <CollapsibleTrigger>
                      <CardTitle className="flex items-center gap-5">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePath(path)}
                        >
                          Delete
                        </Button>
                        <strong>{path}</strong>
                        <div>Records: {entries.length} </div>
                      </CardTitle>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <div className="mb-6 flex flex-col">
                        <div className="w-full flex justify-start">
                          <div className="flex-1">
                            <Button
                              className={`w-24 ${
                                isCopied[path] ? "bg-green-600" : ""
                              }`}
                              onClick={() => handleCopy(path, entries)}
                            >
                              {isCopied[path] ? "Copied!" : "Copy values"}
                            </Button>
                            <ScrollArea className="mt-5 py-2 px-5 w-[500px] h-60 bg-accent border-black border rounded-lg shadow shadow-black">
                              <ul className="ml-4 mt-1 list-disc">
                                {[...entries].reverse().map((entry, idx) => (
                                  <li key={idx}>
                                    {entry.timestamp} → {String(entry.value)}
                                  </li>
                                ))}
                              </ul>
                            </ScrollArea>
                          </div>
                          <div className="flex-1">
                            {numericEntries.length > 0 && (
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart
                                  data={entries}
                                  margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                  }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="timestamp" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#82ca9d"
                                    dot={false}
                                    isAnimationActive={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}
