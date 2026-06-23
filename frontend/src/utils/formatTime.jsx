const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();

    // Calculate day difference by resetting time components
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = today - messageDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Format time (e.g. 3:45 PM)
    const formatTime = () => {
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 hour should be 12
        return `${hours}:${minutes} ${ampm}`;
    };

    if (diffDays === 0) {
        return formatTime();
    } else if (diffDays === 1) {
        return "Yesterday";
    } else if (diffDays < 7) {
        // E.g. "Monday"
        return date.toLocaleDateString(undefined, { weekday: "long" });
    } else {
        // E.g. "6/23/2026"
        return date.toLocaleDateString(undefined, {
            month: "numeric",
            day: "numeric",
            year: "numeric"
        });
    }
};

export default formatTimestamp;
