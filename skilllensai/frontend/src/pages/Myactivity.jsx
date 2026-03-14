
import React, { useEffect, useState } from "react";
import axios from "axios";

const MyActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    let mounted = true;
    const fetchActivity = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("/api/profile/activity", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        setActivities(res.data.activities || []);
      } catch (err) {
        if (!mounted) return;
        setError("Failed to fetch activity");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchActivity();
    // poll every 8 seconds to simulate realtime feed
    const id = setInterval(fetchActivity, 8000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  }

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-4">My Activity</h1>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <div className="space-y-3">
        {Array.isArray(activities) && activities.length ? (
          activities.map((act) => (
            <div key={act._id} className="p-3 rounded-lg bg-white shadow-sm flex items-start gap-3">
              <div className="w-3 h-10 rounded bg-indigo-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-800">{act.type}</div>
                  <div className="text-xs text-gray-400">{formatDate(act.createdAt)}</div>
                </div>
                <div className="text-sm text-gray-700 mt-1">{act.message}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-500">No recent activity</div>
        )}
      </div>
    </div>
  );
};

export default MyActivity;