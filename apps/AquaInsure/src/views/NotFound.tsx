'use client';

import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import ErrorDisplay from "@/components/ErrorDisplay";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/' && location.pathname !== '/aquainsure') {
      console.warn("404 Error: Non-existent route accessed:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <ErrorDisplay
      statusCode={404}
      title="Page Not Found"
      message="The screen or farm document you are looking for does not exist or has been moved."
      showHomeButton={true}
      showBackButton={true}
    />
  );
};

export default NotFound;
