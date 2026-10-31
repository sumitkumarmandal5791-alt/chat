import React from 'react';

/**
 * Segmented story ring around an avatar (WhatsApp style in SVG)
 *
 * @param {Array} statuses - Array of statuses in the group
 * @param {number} size - Outer diameter in px (e.g. 56)
 * @param {number} strokeWidth - Ring thickness in px (e.g. 2.5)
 * @param {React.ReactNode} children - Avatar element placed inside
 */
const StatusRing = ({ statuses = [], size = 56, strokeWidth = 2.5, children, className = '' }) => {
    const count = statuses.length;

    if (!count || count === 0) {
        return <div className={`relative ${className}`}>{children}</div>;
    }

    const radius = (size - strokeWidth * 2) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    // Single status: full circle
    if (count === 1) {
        const isUnviewed = !statuses[0].hasViewed;
        const strokeColor = isUnviewed ? '#25D366' : '#8696a0';

        return (
            <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
                <svg className="absolute inset-0 pointer-events-none -rotate-90" width={size} height={size}>
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="relative z-10 flex items-center justify-center overflow-hidden rounded-full" style={{ width: size - strokeWidth * 4, height: size - strokeWidth * 4 }}>
                    {children}
                </div>
            </div>
        );
    }

    // Multiple statuses: segmented ring with gap
    const gapAngle = Math.min(10, 360 / (count * 4)); // gap in degrees
    const segmentAngle = (360 - count * gapAngle) / count;
    const segmentLength = (segmentAngle / 360) * circumference;
    const gapLength = (gapAngle / 360) * circumference;

    return (
        <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
            <svg className="absolute inset-0 pointer-events-none -rotate-90" width={size} height={size}>
                {statuses.map((status, index) => {
                    const isUnviewed = !status.hasViewed;
                    const strokeColor = isUnviewed ? '#25D366' : '#8696a0';
                    const strokeDashoffset = -index * (segmentLength + gapLength);

                    return (
                        <circle
                            key={status._id || index}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>
            <div className="relative z-10 flex items-center justify-center overflow-hidden rounded-full" style={{ width: size - strokeWidth * 4, height: size - strokeWidth * 4 }}>
                {children}
            </div>
        </div>
    );
};

export default StatusRing;

