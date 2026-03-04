import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { apiPut, apiUpload } from "../../services/api";
import { USERS } from "../../services/endpoints";
import { takePicture, isNative } from "../../services/native";
import { sanitizeText, sanitizeUrl, isValidEmail } from "../../utils/sanitize";
import { GRADIENTS, adaptColor } from "../../styles/colors";
import {
  ArrowLeft, Camera, User, Mail, Clock, MapPin,
  FileText, Check, X, Image, Loader
} from "lucide-react";
import IconButton from "../../components/shared/IconButton";
import GlassCard from "../../components/shared/GlassCard";
import GlassInput from "../../components/shared/GlassInput";
import GlassAppBar from "../../components/shared/GlassAppBar";
import GradientButton from "../../components/shared/GradientButton";
import GlassModal from "../../components/shared/GlassModal";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Edit Profile Screen v1
 *
 * From Flutter: avatar upload, display name, timezone fields, save
 * UX Upgrades: bio field, avatar picker bottom sheet (camera/gallery),
 *   inline validation, success toast, unsaved changes warning
 * ═══════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════
export default function EditProfileScreen(){
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  var { user, refreshUser, updateUser } = useAuth();
  var { showToast } = useToast();
  var queryClient = useQueryClient();
  const[mounted,setMounted]=useState(false);
  const[name,setName]=useState((user && user.displayName) || "");
  const[bio,setBio]=useState((user && user.bio) || "");
  const[timezone,setTimezone]=useState((user && user.timezone) || "");
  const[avatarPreview,setAvatarPreview]=useState(null);
  const[avatarFile,setAvatarFile]=useState(null);
  const[showPicker,setShowPicker]=useState(false);
  const[errors,setErrors]=useState({});
  const fileRef=useRef(null);

  var userEmail = (user && user.email) || "";
  var userInitial = (user && user.displayName) ? user.displayName.charAt(0).toUpperCase() : "?";
  var userAvatarUrl = (user && user.avatarUrl) || null;

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  var profileMutation = useMutation({
    mutationFn: function(data) {
      return apiPut(USERS.UPDATE_PROFILE, data);
    },
    onSuccess: function(data) {
      updateUser({ displayName: name.trim(), bio: bio.trim(), timezone: timezone });
      queryClient.invalidateQueries({ queryKey: ["user"] });
      showToast("Profile updated successfully!", "success");
      navigate("/profile");
    },
    onError: function(err) {
      showToast(err.userMessage || err.message || "Failed to update profile", "error");
    },
  });

  var avatarMutation = useMutation({
    mutationFn: function(file) {
      var formData = new FormData();
      formData.append("avatar", file);
      return apiUpload(USERS.UPLOAD_AVATAR, formData);
    },
    onSuccess: function(data) {
      var newUrl = (data && data.avatarUrl) || null;
      updateUser({ avatarUrl: newUrl });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: function(err) {
      showToast(err.userMessage || err.message || "Failed to upload avatar", "error");
    },
  });

  var saving = profileMutation.isPending || avatarMutation.isPending;

  var origName = (user && user.displayName) || "";
  var origBio = (user && user.bio) || "";
  var origTimezone = (user && user.timezone) || "";
  const hasChanges=name!==origName||bio!==origBio||timezone!==origTimezone||avatarPreview;

  const handleFileSelect=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    var validTypes=["image/jpeg","image/png","image/webp","image/gif"];
    if(!validTypes.includes(file.type)){setErrors({avatar:"Invalid image type. Use JPEG, PNG, WebP, or GIF."});return;}
    if(file.size>5*1024*1024){setErrors({avatar:"File too large. Maximum 5MB."});return;}
    const reader=new FileReader();
    reader.onload=(ev)=>{setAvatarPreview(ev.target.result);setAvatarFile(file);setShowPicker(false);setErrors({});};
    reader.readAsDataURL(file);
  };

  const validate=()=>{
    const e={};
    var cleanName=name.replace(/[<>"'`;\\]/g,"").trim();
    if(!cleanName)e.name="Display name is required";
    else if(cleanName.length<2)e.name="Name must be at least 2 characters";
    else if(cleanName.length>50)e.name="Name must be under 50 characters";
    var cleanBio=bio.replace(/[<>"'`;\\]/g,"");
    if(cleanBio.length>200)e.bio="Bio must be under 200 characters";
    setErrors(e);return Object.keys(e).length===0;
  };

  const handleSave=()=>{
    if(!validate())return;
    var cleanName = sanitizeText(name, 50);
    var cleanBio = sanitizeText(bio, 500);
    var cleanTimezone = sanitizeText(timezone, 100);
    if (!cleanName) { showToast("Display name is required", "error"); return; }
    if(avatarFile){
      avatarMutation.mutate(avatarFile);
    }
    profileMutation.mutate({
      displayName: cleanName,
      bio: cleanBio,
      timezone: cleanTimezone,
    });
  };

  const Field=({icon:I,label,value,onChange,error,placeholder,disabled,multiline,maxLen})=>(
    <div style={{marginBottom:16}}>
      <GlassInput
        icon={multiline?undefined:I}
        label={label}
        value={value}
        onChange={function(e){onChange(e.target.value);}}
        placeholder={placeholder}
        disabled={disabled}
        multiline={multiline}
        maxLength={maxLen}
        showCount={!!maxLen}
        error={error}
      />
    </div>
  );

  return(
    <div className="dp-desktop-main" style={{position:"absolute",inset:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>

      {/* APPBAR */}
      <GlassAppBar
        className="dp-desktop-header"
        left={<IconButton icon={ArrowLeft} onClick={() => navigate("/profile")} label="Go back" />}
        title="Edit Profile"
        right={
          hasChanges && !saving
            ? <span style={{fontSize:12,color:"var(--dp-warning)",fontWeight:500}}>Unsaved changes</span>
            : saving
            ? <span style={{fontSize:12,color:"var(--dp-success)",fontWeight:600,display:"flex",alignItems:"center",gap:4}}><Loader size={14} strokeWidth={2.5} className="dp-spin"/>Saving...</span>
            : null
        }
      />

      <main style={{flex:1,overflowY:"auto",overflowX:"hidden",zIndex:10,padding:"24px 16px 32px",opacity:uiOpacity,transition:"opacity 0.3s ease"}}>
        <div style={{maxWidth:440,margin:"0 auto"}}>

          {/* ── Avatar ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"0ms",textAlign:"center",marginBottom:32}}>
            <div style={{position:"relative",width:120,height:120,margin:"0 auto"}}>
              {/* Gradient ring */}
              <div style={{position:"absolute",inset:-4,borderRadius:"50%",background:"conic-gradient(from 0deg,#8B5CF6,#C4B5FD,#5DE5A8,#14B8A6,#8B5CF6)",opacity:0.6,filter:"blur(1px)"}}/>
              <div style={{position:"absolute",inset:-4,borderRadius:"50%",background:"conic-gradient(from 0deg,#8B5CF6,#C4B5FD,#5DE5A8,#14B8A6,#8B5CF6)",animation:"dpSpin 6s linear infinite",opacity:0.3}}/>
              {/* Avatar circle */}
              <div style={{position:"relative",width:120,height:120,borderRadius:"50%",background:isLight?"#f5f3ff":"#0c081a",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",border:isLight?"4px solid #f5f3ff":"4px solid #0c081a"}}>
                {avatarPreview?(
                  <img src={avatarPreview} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                ):userAvatarUrl?(
                  <img src={userAvatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                ):(
                  <span style={{fontSize:42,fontWeight:700,color:"var(--dp-accent-text)"}}>{userInitial}</span>
                )}
              </div>
              {/* Camera button */}
              <button aria-label="Change profile photo" className="dp-gh" onClick={()=>setShowPicker(true)} style={{position:"absolute",bottom:0,right:0,width:38,height:38,borderRadius:"50%",background:GRADIENTS.primaryDark,border:isLight?"3px solid #f5f3ff":"3px solid #0c081a",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 12px rgba(139,92,246,0.4)",transition:"all 0.2s",fontFamily:"inherit"}}>
                <Camera size={16} strokeWidth={2.5}/>
              </button>
            </div>
            <div style={{marginTop:12,fontSize:12,color:"var(--dp-text-tertiary)"}}>Tap the camera to change your photo</div>
          </div>

          {/* ── Form ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"100ms"}}>
            <GlassCard padding={20}>
              <Field icon={User} label="Display Name" name="name" value={name} onChange={setName} error={errors.name} placeholder="Your name"/>
              <Field icon={Mail} label="Email" name="email" value={userEmail} onChange={()=>{}} disabled placeholder="" />
              <Field icon={Clock} label="Timezone" name="tz" value={timezone} onChange={setTimezone} placeholder="e.g. America/New_York"/>
              <Field icon={FileText} label="Bio" name="bio" value={bio} onChange={setBio} placeholder="Tell others about yourself..." multiline maxLen={200}/>
            </GlassCard>
          </div>

          {/* ── Save Button ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"200ms"}}>
            <GradientButton
              gradient="primaryDark"
              fullWidth
              onClick={handleSave}
              disabled={saving || !hasChanges}
              loading={saving}
              icon={saving ? undefined : Check}
              style={{ marginTop: 24, padding: "15px 0", borderRadius: 16 }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </GradientButton>
          </div>

        </div>
      </main>

      {/* ═══ IMAGE PICKER BOTTOM SHEET ═══ */}
      <GlassModal open={showPicker} onClose={() => setShowPicker(false)} variant="bottom" title="Change Profile Photo">
        <div style={{padding:"8px 0 24px"}}>
          {[
            {Icon:Camera,label:"Take Photo",color:"#C4B5FD",action:()=>{
              if (isNative) {
                takePicture({ source: "camera" }).then(function (photo) {
                  if (photo && photo.dataUrl) {
                    setAvatarPreview(photo.dataUrl);
                    // Convert dataUrl to File for upload
                    fetch(photo.dataUrl).then(function (res) { return res.blob(); }).then(function (blob) {
                      var file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
                      setAvatarFile(file);
                    });
                  }
                  setShowPicker(false);
                }).catch(function () { setShowPicker(false); });
              } else {
                setShowPicker(false);
                fileRef.current?.click();
              }
            }},
            {Icon:Image,label:"Choose from Gallery",color:"#5DE5A8",action:()=>{
              if (isNative) {
                takePicture({ source: "gallery" }).then(function (photo) {
                  if (photo && photo.dataUrl) {
                    setAvatarPreview(photo.dataUrl);
                    fetch(photo.dataUrl).then(function (res) { return res.blob(); }).then(function (blob) {
                      var file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
                      setAvatarFile(file);
                    });
                  }
                  setShowPicker(false);
                }).catch(function () { setShowPicker(false); });
              } else {
                fileRef.current?.click();
              }
            }},
          ].map(({Icon:I,label,color,action},i)=>(
            <button key={i} onClick={action} className="dp-gh" style={{width:"100%",padding:"14px 20px",border:"none",background:"transparent",display:"flex",alignItems:"center",gap:14,cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit"}}>
              <div style={{width:40,height:40,borderRadius:12,background:`${color}12`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <I size={18} color={adaptColor(color,isLight)} strokeWidth={2}/>
              </div>
              <span style={{fontSize:15,fontWeight:500,color:"var(--dp-text)"}}>{label}</span>
            </button>
          ))}

          {avatarPreview&&(
            <button onClick={()=>{setAvatarPreview(null);setAvatarFile(null);setShowPicker(false);}} className="dp-gh" style={{width:"100%",padding:"14px 20px",border:"none",background:"transparent",display:"flex",alignItems:"center",gap:14,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>
              <div style={{width:40,height:40,borderRadius:12,background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <X size={18} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
              </div>
              <span style={{fontSize:15,fontWeight:500,color:"rgba(239,68,68,0.8)"}}>Remove Photo</span>
            </button>
          )}

          <button onClick={()=>setShowPicker(false)} style={{width:"calc(100% - 32px)",margin:"12px 16px 0",padding:"12px",borderRadius:14,border:"1px solid var(--dp-input-border)",background:"var(--dp-surface)",color:"var(--dp-text-secondary)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        </div>
      </GlassModal>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFileSelect}/>


      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}::-webkit-scrollbar{width:0;}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.3);}
        .dp-ib{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.05);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;}
        .dp-ib:hover{background:rgba(255,255,255,0.1);}
        .dp-a{opacity:0;transform:translateY(16px);transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),transform 0.5s cubic-bezier(0.16,1,0.3,1);}
        .dp-a.dp-s{opacity:1;transform:translateY(0);}
        .dp-spin{animation:dpSp 1s linear infinite;}
        @keyframes dpSp{from{transform:rotate(0);}to{transform:rotate(360deg);}}
        @keyframes dpSpin{from{transform:rotate(0);}to{transform:rotate(360deg);}}
        @keyframes dpSlideUp{from{transform:translateY(100%);}to{transform:translateY(0);}}
      `}</style>
    </div>
  );
}
