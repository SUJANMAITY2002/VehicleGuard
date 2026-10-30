import { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";


const useSiteOptions = (module, businessEntity) => {
  const [sites, setSites]     = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!module || !businessEntity) {
      setSites([]);
      return;
    }

    const fetchSites = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/sites/filter`, {
          params: { module, businessEntity, status: "Active" },
        });
        setSites(res.data);
      } catch (err) {
        console.log("Error loading sites:", err);
        setSites([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [module, businessEntity]);

  return { sites, loading };
};

export default useSiteOptions;