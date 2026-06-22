
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import useLoginStore from "../../store/userLoginStore";
// import useUserStore from '../../store/useruserStore';
// import useThemeStore from '../../store/themeStore';
// import * as yup from 'yup';
// import { yupResolver } from "@hookform/resolvers/yup";
// import { useForm } from "react-hook-form";
// import { motion } from 'framer-motion';
// import { FaWhatsapp, FaChevronDown, FaUser, FaCamera } from 'react-icons/fa';
// import countries from '../../utils/countries';
// import Spinner from "../../utils/spinner";
// import { sendOtp, verifyOtp, updateProfile } from "../../services/user.services";
// import { toast } from 'react-toastify';

// const loginValidationSchema = yup
//     .object({
//         phoneNumber: yup.string().nullable().notRequired()
//             .transform((value, originalValue) =>
//                 originalValue && originalValue.trim() === "" ? null : value
//             )
//             .matches(/^\d+$/, "Phone Number Must Be Digits"),
//         email: yup.string().email("Invalid Email").nullable().notRequired()
//             .transform((value, originalValue) =>
//                 originalValue && originalValue.trim() === "" ? null : value
//             )
//     })
//     .test(
//         "at-least-one",
//         "Either email or phone number is required",
//         function (value) {
//             return !!(value?.phoneNumber || value?.email);
//         }
//     );

// const otpValidationSection = yup.object().shape({
//     otp: yup.string()
//         .matches(/^\d{6}$/, "OTP must be exactly 6 numerical digits")
//         .required("OTP is Required")
// });

// const profileValidationSchema = yup.object().shape({
//     username: yup.string().required("Username is required").min(3, "Username must be at least 3 characters"),
//     agreed: yup.bool().oneOf([true], "You must agree to the terms and conditions")
// });

// const avatars = [
//     'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
//     'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
//     'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
//     'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
//     'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
//     'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
// ];

// const Login = () => {
//     const navigate = useNavigate();
//     const { step, setStep, userPhoneData, setUserPhoneData, resetLoginState } = useLoginStore();
//     const { setUser } = useUserStore();
//     const { theme } = useThemeStore();

//     const [profilePicture, setProfilePicture] = useState(null);
//     const [selectAvatar, setSelectedAvatar] = useState(avatars[0]);
//     const [profilePictureFile, setProfilePictrueFile] = useState(null);
//     const [error, setError] = useState("");
//     const [selectedCountry, setSelectedCountry] = useState(countries[0]);
//     const [isDropDownOpen, setIsDropDownOpen] = useState(false);
//     const [searchedCounties, setSearchedCounties] = useState("");
//     const [loading, setLoading] = useState(false);

//     const dropDownRef = useRef(null);

//     // Close the country dropdown when clicking anywhere outside of it
//     useEffect(() => {
//         const handleClickOutside = (event) => {
//             if (dropDownRef.current && !dropDownRef.current.contains(event.target)) {
//                 setIsDropDownOpen(false);
//             }
//         };
//         document.addEventListener("mousedown", handleClickOutside);
//         return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     const filterCountires = countries.filter(
//         country => country.name.toLowerCase().includes(searchedCounties.toLowerCase()) ||
//             country.dialCode.toLowerCase().includes(searchedCounties.toLowerCase())
//     );

//     const {
//         register: loginRegister,
//         handleSubmit: handleLoginSubmit,
//         formState: { errors: LoginErrors }
//     } = useForm({ resolver: yupResolver(loginValidationSchema) });

//     const {
//         register: otpRegister,
//         handleSubmit: handleOtpSubmit,
//         formState: { errors: OtpErrors }
//     } = useForm({ resolver: yupResolver(otpValidationSection) });

//     const {
//         register: profileRegister,
//         handleSubmit: handleProfileSubmit,
//         formState: { errors: ProfileErrors }
//     } = useForm({ resolver: yupResolver(profileValidationSchema) });

//     const ProgressBar = () => {
//         return (
//             <div className={`w-full ${theme === 'dark' ? "bg-gray-700" : "bg-gray-200"} rounded-full h-2.5 mb-6`}>
//                 <div
//                     className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
//                     style={{ width: `${(step / 3) * 100}%` }}
//                 />
//             </div>
//         );
//     };

//     const onLoginSubmit = async (data) => {
//         try {
//             setLoading(true);
//             setError("");
//             // FIXED: Using data argument directly instead of matching isolated state variants
//             if (data.email) {
//                 const response = await sendOtp(null, data.email, null);
//                 if (response.status === 'success') {
//                     setUserPhoneData({ email: data.email });
//                     toast.info('OTP Sent Successfully to email');
//                     setStep(2);
//                 }
//             } else if (data.phoneNumber) {
//                 const response = await sendOtp(data.phoneNumber, null, selectedCountry.dialCode);
//                 if (response.status === 'success') {
//                     setUserPhoneData({ phoneNumber: data.phoneNumber, phoneSuffix: selectedCountry.dialCode });
//                     toast.info('OTP Sent Successfully to phone number');
//                     setStep(2);
//                 }
//             }
//         } catch (err) {
//             console.error(err);
//             setError(err?.response?.data?.message || err.message || "An error occurred");
//         } finally {
//             setLoading(false);
//         }
//     };

//     const onOtpSubmitLocal = async (data) => {
//         try {
//             setLoading(true);
//             setError("");
//             let response;
//             if (userPhoneData?.email) {
//                 response = await verifyOtp(null, null, data.otp, userPhoneData.email);
//             } else {
//                 response = await verifyOtp(userPhoneData.phoneNumber, userPhoneData.phoneSuffix, data.otp);
//             }

//             if (response.status === "success") {
//                 toast.info("OTP Verified successfully");
//                 const userData = response.data?.user;

//                 if (userData?.username && (userData?.profilePicture || userData?.profilePictureFile)) {
//                     setUser(userData);
//                     toast.success('Welcome back!');
//                     navigate('/');
//                     resetLoginState();
//                 } else {
//                     setStep(3);
//                 }
//             }
//         } catch (err) {
//             setError(err?.response?.data?.message || err.message || "Invalid OTP");
//         } finally {
//             setLoading(false);
//         }
//     };

//     const profileSubmit = async (data) => {
//         try {
//             setLoading(true);
//             setError("");
//             const profileData = new FormData();
//             profileData.append("username", data.username);

//             if (userPhoneData?.email) profileData.append("email", userPhoneData.email);
//             if (profilePictureFile) {
//                 profileData.append("media", profilePictureFile);
//             } else {
//                 profileData.append("profilePicture", selectAvatar);
//             }

//             const response = await updateProfile(profileData);
//             if (response.status === 'success') {
//                 toast.success('Profile created successfully');
//                 setUser(response.data.user);
//                 navigate('/');
//                 resetLoginState();
//             }
//         } catch (err) {
//             setError(err?.message || "Profile setup failed");
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleFileChange = (event) => {
//         const file = event.target.files[0];
//         if (file) {
//             setProfilePictrueFile(file);
//             setProfilePicture(URL.createObjectURL(file));
//         }
//     };

//     return (
//         <div className={`min-h-screen ${theme === "dark" ? "bg-gray-900" : "bg-gradient-to-br from-green-400 to-blue-500"} flex items-center justify-center p-4`}>
//             <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} className={`${theme === 'dark' ? "bg-gray-800 text-white" : "bg-white"} p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md`}>
//                 <motion.div
//                     initial={{ scale: 0 }}
//                     animate={{ scale: 1 }}
//                     transition={{ duration: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
//                     className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"
//                 >
//                     <FaWhatsapp className="w-16 h-16 text-white" />
//                 </motion.div>
//                 <h1 className="text-3xl font-bold text-center mb-6">Alyx Chat System</h1>
//                 <ProgressBar />

//                 {error && <p className="text-red-500 text-center p-2 my-2 bg-red-100 rounded">{error}</p>}

//                 {/* FIXED: Attached form handler properly */}
//                 {step === 1 && (
//                     <form onSubmit={handleLoginSubmit(onLoginSubmit)}>
//                         <p className="text-xl font-bold text-center mb-4">Enter your Details</p>
//                         <div ref={dropDownRef} className="flex items-center border rounded-xl mb-4 relative">
//                             <button type="button" onClick={() => setIsDropDownOpen(!isDropDownOpen)} className="flex items-center gap-2 px-4 py-3 border-r bg-gray-50 text-gray-800 rounded-l-xl">
//                                 <span>{selectedCountry.flag}</span>
//                                 <span>{selectedCountry.dialCode}</span>
//                                 <FaChevronDown />
//                             </button>
//                             {isDropDownOpen && (
//                                 <div className="absolute top-full left-0 mt-2 w-[280px] max-h-64 overflow-hidden flex flex-col bg-white border z-50 shadow-xl rounded-xl text-gray-800">
//                                     <div className="p-2 border-b">
//                                         <input
//                                             type="text"
//                                             placeholder="Search country..."
//                                             value={searchedCounties}
//                                             onChange={(e) => setSearchedCounties(e.target.value)}
//                                             className="w-full px-3 py-2 rounded-lg outline-none text-sm bg-gray-100"
//                                         />
//                                     </div>
//                                     <div className="overflow-y-auto flex-1">
//                                         {filterCountires.length > 0 ? filterCountires.map(country => (
//                                             <button key={country.alpha2 + country.dialCode} type="button" onClick={() => { setSelectedCountry(country); setIsDropDownOpen(false); setSearchedCounties(""); }} className="w-full flex justify-between px-4 py-2 hover:bg-gray-100 text-sm text-left">
//                                                 <span>{country.flag} {country.name}</span>
//                                                 <span>{country.dialCode}</span>
//                                             </button>
//                                         )) : (
//                                             <div className="px-4 py-4 text-sm text-center text-gray-500">No countries found</div>
//                                         )}
//                                     </div>
//                                 </div>
//                             )}
//                             <input type="tel" placeholder="Phone number" {...loginRegister("phoneNumber")} className="flex-1 px-4 py-3 outline-none text-gray-800 bg-transparent" />
//                         </div>
//                         {LoginErrors.phoneNumber && <p className="text-red-500 text-xs mb-2">{LoginErrors.phoneNumber.message}</p>}

//                         <div className="flex items-center border rounded-xl mb-4 p-1 text-gray-800">
//                             <FaUser className="mx-3 text-gray-400" />
//                             <input type="email" placeholder="Email (optional)" {...loginRegister("email")} onFocus={() => setIsDropDownOpen(false)} className="flex-1 py-3 outline-none bg-transparent" />
//                         </div>
//                         {LoginErrors.email && <p className="text-red-500 text-xs mb-2">{LoginErrors.email.message}</p>}

//                         <button type="submit" disabled={loading} className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors">
//                             {loading ? <Spinner size="medium" color="light" /> : "Send OTP"}
//                         </button>
//                     </form>
//                 )}

//                 {step === 2 && (
//                     <form onSubmit={handleOtpSubmit(onOtpSubmitLocal)}>
//                         <p className="text-xl font-bold text-center mb-4">Enter 6-digit OTP</p>
//                         <input
//                             type="text"
//                             inputMode="numeric"
//                             autoComplete="one-time-code"
//                             placeholder="X-X-X-X-X-X"
//                             disabled={loading}
//                             {...otpRegister("otp")}
//                             maxLength={6}
//                             className="w-full text-center tracking-widest font-bold text-xl p-3 border rounded-xl mb-4 text-gray-800 bg-transparent disabled:opacity-60"
//                         />
//                         {OtpErrors.otp && <p className="text-red-500 text-xs mb-2">{OtpErrors.otp.message}</p>}
//                         <button type="submit" disabled={loading} className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl">
//                             {!loading ? <Spinner size="medium" color="light" /> : "Verify OTP"}
//                         </button>
//                     </form>
//                 )}

//                 {step === 3 && (
//                     <form onSubmit={handleProfileSubmit(profileSubmit)} className="space-y-4">
//                         <p className="text-xl font-bold text-center mb-2">Setup Profile</p>
//                         <div className="flex flex-col items-center space-y-3">
//                             <div className="relative">
//                                 <img src={profilePicture || selectAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border" />
//                                 <label className="absolute bottom-0 right-0 bg-green-500 p-2 rounded-full cursor-pointer text-white">
//                                     <FaCamera className="w-3 h-3" />
//                                     <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
//                                 </label>
//                             </div>

//                             {/* Preset avatar picker — disabled once a custom file is chosen */}
//                             <div className="grid grid-cols-6 gap-2">
//                                 {avatars.map((avatarUrl) => (
//                                     <button
//                                         key={avatarUrl}
//                                         type="button"
//                                         onClick={() => {
//                                             setSelectedAvatar(avatarUrl);
//                                             setProfilePictrueFile(null);
//                                             setProfilePicture(null);
//                                         }}
//                                         className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-colors ${!profilePictureFile && selectAvatar === avatarUrl
//                                             ? "border-green-500"
//                                             : "border-transparent"
//                                             }`}
//                                     >
//                                         <img src={avatarUrl} alt="Avatar option" className="w-full h-full object-cover" />
//                                     </button>
//                                 ))}
//                             </div>
//                         </div>
//                         <input type="text" placeholder="Username" {...profileRegister("username")} className="w-full p-3 border rounded-xl text-gray-800" />
//                         {ProfileErrors.username && <p className="text-red-500 text-xs">{ProfileErrors.username.message}</p>}
//                         <label className="flex items-center gap-2">
//                             <input type="checkbox" {...profileRegister("agreed")} />
//                             <span className="text-xs text-gray-400">Agree to Terms & Conditions</span>
//                         </label>
//                         {ProfileErrors.agreed && <p className="text-red-500 text-xs">{ProfileErrors.agreed.message}</p>}
//                         <button type="submit" disabled={loading} className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl">Finish</button>
//                     </form>
//                 )}
//             </motion.div>
//         </div>
//     );
// };

// export default Login;














import React, { useState } from 'react'; // Added useState here
import { useNavigate } from 'react-router-dom';
import useLoginStore from "../../store/userLoginStore";
import useUserStore from '../../store/useruserStore';
import useThemeStore from '../../store/themeStore';
import * as yup from 'yup';
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { motion } from 'framer-motion';
import { FaWhatsapp, FaChevronDown, FaUser, FaCamera, FaArrowLeft } from 'react-icons/fa';
import countries from '../../utils/countries';
import Spinner from "../../utils/spinner";
import { sendOtp, verifyOtp, updateProfile } from "../../services/user.services";
import { toast } from 'react-toastify';

const loginValidationSchema = yup
    .object({
        phoneNumber: yup.string().nullable().notRequired()
            .transform((value, originalValue) =>
                originalValue && originalValue.trim() === "" ? null : value
            )
            .matches(/^\d+$/, "Phone Number Must Be Digits"),
        email: yup.string().email("Invalid Email").nullable().notRequired()
            .transform((value, originalValue) =>
                originalValue && originalValue.trim() === "" ? null : value
            )
    })
    .test(
        "at-least-one",
        "Either email or phone number is required",
        function (value) {
            return !!(value?.phoneNumber || value?.email);
        }
    );

const otpValidationSection = yup.object().shape({
    otp: yup.string().length(6, "OTP must be exactly 6 digits").required("OTP is Required")
});

const profileValidationSchema = yup.object().shape({
    username: yup.string().required("Username is required"),
    agreed: yup.bool().oneOf([true], "You must agree to the terms")
});

const avatars = [
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe',
];

const Login = () => {
    const navigate = useNavigate();
    const { step, setStep, userPhoneData, setUserPhoneData, resetLoginState } = useLoginStore();
    const { setUser, clearuser, user, isAuthenticated } = useUserStore();
    const { theme, setTheme } = useThemeStore();

    // These hooks will now work because useState is imported
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [profilePicture, setProfilePicture] = useState(null);
    const [selectAvatar, setSelectedAvatar] = useState(avatars[0]);
    const [profilePictureFile, setProfilePictrueFile] = useState(null); // Cleaned up variable name naming mismatch slightly
    const [error, setError] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(countries[0]);
    const [isDropDownOpen, setIsDropDownOpen] = useState(false);
    const [searchedCounties, setSearchedCounties] = useState("");
    const [loading, setLoading] = useState(false);

    const filterCountires = countries.filter(
        country => country.name.toLowerCase().includes(searchedCounties.toLowerCase()) ||
            country.dialCode.toLowerCase().includes(searchedCounties.toLowerCase())
    );
    const {
        register: loginRegister,
        handleSubmit: handleLoginSubmit,
        formState: { errors: LoginErrors },
        setValue: setLoginValue
    } = useForm({
        resolver: yupResolver(loginValidationSchema)
    });

    const {
        register: otpRegister,
        handleSubmit: handleOtpSubmit,
        formState: { errors: OtpErrors },
        setValue: setOtpValue
    } = useForm({
        resolver: yupResolver(otpValidationSection)
    });

    const {
        register: profileRegister,
        handleSubmit: handleProfileSubmit,
        formState: { errors: ProfileErrors },
        watch: watchProfile
    } = useForm({
        resolver: yupResolver(profileValidationSchema)
    });

    const ProgressBar = () => {
        return (
            <div className={`w-full ${theme === 'dark' ? "bg-gray-700" : "bg-gray-200"} rounded-full h-2.5 mb-6`}>
                <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out"
                    style={{ width: `${(step / 3) * 100}%` }} // Handled percentage parsing
                />
            </div>
        );
    };
    const handleBack = () => {
        setStep(1);
        setUserPhoneData(null);
        setOtp(["", "", "", "", "", ""]);
        setError("");
    }

    const handleOtpChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        const otpStr = newOtp.join("");
        setOtpValue("otp", otpStr, { shouldValidate: true });

        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const onLoginSubmit = async (data) => {
        try {
            setLoading(true);
            setError("");
            if (data.email) {
                const response = await sendOtp({ email: data.email });
                setUserPhoneData({ email: data.email });
                toast.info(response.message || 'OTP Sent Successfully to email');
                setStep(2);
            } else if (data.phoneNumber) {
                const response = await sendOtp({
                    phoneNumber: data.phoneNumber,
                    phoneSuffix: selectedCountry.dialCode
                });
                setUserPhoneData({
                    phoneNumber: data.phoneNumber,
                    phoneSuffix: selectedCountry.dialCode
                });
                toast.info(response.message || 'OTP Sent Successfully to phone number');
                setStep(2);
            }
        } catch (err) {
            console.error("Login submit error:", err);
            setError(err || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const onOtpSubmit = async (data) => {
        try {
            setLoading(true);
            setError("");
            if (!userPhoneData) {
                throw new Error("Session expired. Please enter details again.");
            }

            const otpString = data.otp || otp.join("");
            let response;

            if (userPhoneData.email) {
                response = await verifyOtp({
                    email: userPhoneData.email,
                    otp: otpString
                });
            } else {
                response = await verifyOtp({
                    phoneNumber: userPhoneData.phoneNumber,
                    phoneSuffix: userPhoneData.phoneSuffix,
                    otp: otpString
                });
            }

            if (response && (response.message === "otp verified successfully" || response.token)) {
                toast.info("Otp Verified successfully");

                // Clear all OTP and login inputs/states
                setOtp(["", "", "", "", "", ""]);
                setOtpValue("otp", "");
                setPhoneNumber("");
                setEmail("");
                setLoginValue("phoneNumber", "");
                setLoginValue("email", "");

                const user = response.user;
                if (user && user.username && (user.profilePicture || user.profilePictureFile)) {
                    setUser(user);
                    toast.success('Welcome to Alyx Chat');
                    navigate('/homePage');
                    resetLoginState();
                } else {
                    setStep(3);
                }
            }
        } catch (err) {
            console.error("Verify OTP error:", err);
            setError(err || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const onProfileSubmit = async (data) => {
        try {
            setLoading(true);
            setError("");

            const profileData = new FormData();
            profileData.append("username", data.username);
            if (data.email) {
                profileData.append("email", data.email);
            } else if (userPhoneData && userPhoneData.email) {
                profileData.append("email", userPhoneData.email);
            }

            if (profilePictureFile) {
                profileData.append("media", profilePictureFile);
            } else {
                profileData.append("profilePicture", selectAvatar);
            }

            const response = await updateProfile(profileData);
            if (response && response.user) {
                toast.success('Profile created successfully');
                setUser(response.user);
                navigate('/');
                resetLoginState();
            } else {
                toast.info(response?.message || "Profile setup succeeded");
            }
        } catch (err) {
            console.error("Profile submit error:", err);
            setError(err || "Profile setup failed");
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setProfilePictrueFile(file);
            setProfilePicture(URL.createObjectURL(file));
        }
    }




    return (
        <div className={`min-h-screen ${theme === "dark"
            ? "bg-green-500"
            : "bg-gradient-to-br from-green-400 to-blue-500"
            } flex items-center justify-center p-4 overflow-hidden`}
        >
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`${theme === 'dark' ? "bg-gray-800 text-white" : "bg-white"} p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md`}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"
                >
                    <FaWhatsapp className="w-16 h-16 text-white" />
                </motion.div>

                <h1 className={`text-3xl font-bold text-center mb-6 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
                    Whatsapp Login
                </h1>
                <ProgressBar />

                {error && <p className={`text-red-500  rounded-md text-center p-2 my-2 ${theme === 'dark' ? "bg-red-700" : "bg-red-200"}`}>{error}</p>}

                {step === 1 && (
                    <form className='space-y-4' onSubmit={handleLoginSubmit(onLoginSubmit)} >
                        <p className={`text-xl font-bold text-center mb-6 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
                            Enter your Phone Number
                        </p>
                        <div className={`flex items-center border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-xl overflow-visible transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent shadow-sm hover:shadow-md mb-2 relative`}>
                            <button
                                type="button"
                                onClick={() => setIsDropDownOpen(!isDropDownOpen)}
                                className={`flex items-center justify-center gap-2 px-4 py-3.5 transition-colors duration-200 outline-none ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'} border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                            >
                                <span className="text-xl leading-none">{selectedCountry.flag}</span>
                                <span className="font-semibold text-sm">{selectedCountry.dialCode}</span>
                                <FaChevronDown className={`w-3 h-3 ml-1 transition-transform duration-200 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} ${isDropDownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isDropDownOpen && (
                                <div className={`absolute top-full left-0 mt-2 w-[280px] max-h-64 overflow-hidden flex flex-col rounded-xl shadow-xl border z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className={`p-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <input
                                            type="text"
                                            placeholder="Search country..."
                                            value={searchedCounties}
                                            onChange={(e) => setSearchedCounties(e.target.value)}
                                            className={`w-full px-3 py-2 rounded-lg outline-none text-sm ${theme === 'dark' ? 'bg-gray-900 text-white placeholder-gray-500 focus:bg-gray-700' : 'bg-gray-100 text-gray-800 placeholder-gray-400 focus:bg-gray-200'} transition-colors`}
                                        />
                                    </div>
                                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                                        {filterCountires.length > 0 ? filterCountires.map(country => (
                                            <button
                                                key={country.alpha2 + country.dialCode}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCountry(country);
                                                    setIsDropDownOpen(false);
                                                    setSearchedCounties("");
                                                }}
                                                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors text-left ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span className="text-xl leading-none">{country.flag}</span>
                                                    <span className="truncate max-w-[140px] font-medium">{country.name}</span>
                                                </span>
                                                <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{country.dialCode}</span>
                                            </button>
                                        )) : (
                                            <div className={`px-4 py-4 text-sm text-center font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No countries found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div>
                                <input
                                    type="tel"
                                    placeholder="Enter phone number"
                                    {...loginRegister("phoneNumber", { onChange: (e) => setPhoneNumber(e.target.value) })}
                                    className={`flex-1 px-4 py-3.5 bg-transparent border-none outline-none font-medium text-base placeholder-gray-400 w-full ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
                                />


                            </div>
                            {LoginErrors.phoneNumber && (
                                <p className={`text-red-500 text-sm rounded-md text-center p-2 my-2 ${theme === 'dark' ? "bg-red-700" : "bg-red-200"}`}>{LoginErrors.phoneNumber.message}</p>
                            )}

                        </div>
                        <div className="flex items-center my-4">
                            <div className={`flex-grow border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}></div>
                            <span className={`px-4 text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                or
                            </span>
                            <div className={`flex-grow border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}></div>
                        </div>

                        {/* email inpur box  */}

                        {/* email input box */}
                        <div className={`flex items-center border ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} rounded-xl overflow-visible transition-all duration-300 focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent shadow-sm hover:shadow-md mb-2 relative p-1`}>
                            <div className={`px-4 py-3.5 border-r ${theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                                <FaUser className="w-5 h-5" />
                            </div>
                            <input
                                type="email"
                                placeholder="Enter email  (optional)"
                                {...loginRegister("email", { onChange: (e) => setEmail(e.target.value) })}
                                onFocus={() => setIsDropDownOpen(false)} // Closes the country list when clicked/focused
                                className={`flex-1 px-4 py-3.5 bg-transparent border-none outline-none font-medium text-base placeholder-gray-400 w-full ${theme === 'dark' ? "text-white" : "text-gray-800"
                                    }`}
                            />
                        </div>

                        {/* email schema validation error display */}
                        {LoginErrors.email && (
                            <p className={`text-red-500 text-sm rounded-md text-center p-2 my-2 ${theme === 'dark' ? "bg-red-700" : "bg-red-200"}`}>
                                {LoginErrors.email.message}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 px-4 font-semibold text-base rounded-xl transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center gap-2 text-white
        ${theme === 'dark'
                                    ? "bg-green-600 hover:bg-green-500 focus:ring-offset-gray-900"
                                    : "bg-green-500 hover:bg-green-600"
                                }
        ${loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
    `}
                        >
                            {loading ? (
                                <Spinner size="medium" color="light" />
                            ) : (
                                "Send OTP"
                            )}
                        </button>
                    </form>
                )}
                {step === 2 && (
                    <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
                        <input type="hidden" {...otpRegister("otp")} />
                        <p className={`text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                            Please enter the 6-digit OTP sent to your {
                                userPhoneData?.email ? "Email" : "Phone"
                            }
                            {" "}
                            {userPhoneData?.email || (userPhoneData?.phoneSuffix + " " + userPhoneData?.phoneNumber)}
                        </p>

                        <div className="flex justify-between">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    className={`w-12 h-12 text-center border ${theme === "dark"
                                        ? "bg-gray-700 border-gray-600 text-white"
                                        : "bg-white border-gray-300"
                                        } rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${OtpErrors?.otp ? "border-red-500" : ""
                                        }`}
                                />
                            ))}
                        </div>

                        {OtpErrors?.otp && (
                            <p className="text-red-500 text-sm">
                                {OtpErrors.otp.message}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition"
                        >
                            {loading ? <Spinner /> : "Verify OTP"}
                        </button>

                        <button
                            type="button"
                            onClick={handleBack}
                            className={`w-full mt-2 ${theme === "dark"
                                ? "bg-gray-700 text-gray-300"
                                : "bg-gray-200 text-gray-700"
                                }`}
                        >
                            <FaArrowLeft className="mr-2" />
                            Wrong number? Go back
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                        <p className="text-xl font-bold text-center mb-2">Setup Profile</p>
                        <div className="flex flex-col items-center space-y-3">
                            <div className="relative">
                                <img src={profilePicture || selectAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border" />
                                <label className="absolute bottom-0 right-0 bg-green-500 p-2 rounded-full cursor-pointer text-white">
                                    <FaCamera className="w-3 h-3" />
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>

                            {/* Preset avatar picker — disabled once a custom file is chosen */}
                            <div className="grid grid-cols-6 gap-2">
                                {avatars.map((avatarUrl) => (
                                    <button
                                        key={avatarUrl}
                                        type="button"
                                        onClick={() => {
                                            setSelectedAvatar(avatarUrl);
                                            setProfilePictrueFile(null);
                                            setProfilePicture(null);
                                        }}
                                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-colors ${!profilePictureFile && selectAvatar === avatarUrl
                                            ? "border-green-500"
                                            : "border-transparent"
                                            }`}
                                    >
                                        <img src={avatarUrl} alt="Avatar option" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input type="text" placeholder="Username" {...profileRegister("username")} className={`w-full p-3 border rounded-xl ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'text-gray-800'}`} />
                        {ProfileErrors.username && <p className="text-red-500 text-xs">{ProfileErrors.username.message}</p>}
                        <label className="flex items-center gap-2">
                            <input type="checkbox" {...profileRegister("agreed")} />
                            <span className="text-xs text-gray-400">Agree to Terms & Conditions</span>
                        </label>
                        {ProfileErrors.agreed && <p className="text-red-500 text-xs">{ProfileErrors.agreed.message}</p>}
                        <button type="submit" disabled={loading} className="w-full py-3 bg-green-500 text-white font-semibold rounded-xl">Finish</button>
                    </form>
                )}


            </motion.div>

        </div >

    );
}

export default Login;
