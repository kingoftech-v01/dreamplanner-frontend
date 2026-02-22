import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  ArrowLeft, Camera, User, Mail, Clock, MapPin,
  FileText, Check, X, Image, Loader
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
 * DreamPlanner — Edit Profile Screen v1
 *
 * From Flutter: avatar upload, display name, timezone fields, save
 * UX Upgrades: bio field, avatar picker bottom sheet (camera/gallery),
 *   inline validation, success toast, unsaved changes warning
 * ═══════════════════════════════════════════════════════════════════ */

const USER = {
  name:"Stephane", initial:"S", email:"stephane@rhematek.com",
  timezone:"America/Toronto", bio:"Full-stack dev at Rhematek Solutions. Building dreams one line of code at a time.",
  avatarUrl:null,
};

// ═══════════════════════════════════════════════════════════════════
export default function EditProfileScreen(){
  const navigate=useNavigate();
  const{resolved,uiOpacity}=useTheme();const isLight=resolved==="light";
  const[mounted,setMounted]=useState(false);
  const[name,setName]=useState(USER.name);
  const[bio,setBio]=useState(USER.bio);
  const[timezone,setTimezone]=useState(USER.timezone);
  const[avatarPreview,setAvatarPreview]=useState(null);
  const[showPicker,setShowPicker]=useState(false);
  const[saving,setSaving]=useState(false);
  const[saved,setSaved]=useState(false);
  const[errors,setErrors]=useState({});
  const[focused,setFocused]=useState(null);
  const fileRef=useRef(null);

  useEffect(()=>{setTimeout(()=>setMounted(true),100);},[]);

  const hasChanges=name!==USER.name||bio!==USER.bio||timezone!==USER.timezone||avatarPreview;

  const handleFileSelect=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    var validTypes=["image/jpeg","image/png","image/webp","image/gif"];
    if(!validTypes.includes(file.type)){setErrors({avatar:"Invalid image type. Use JPEG, PNG, WebP, or GIF."});return;}
    if(file.size>5*1024*1024){setErrors({avatar:"File too large. Maximum 5MB."});return;}
    const reader=new FileReader();
    reader.onload=(ev)=>{setAvatarPreview(ev.target.result);setShowPicker(false);setErrors({});};
    reader.readAsDataURL(file);
  };

  const validate=()=>{
    const e={};
    var cleanName=name.replace(/[<>"'`;\\]/g,"").trim();
    if(!cleanName)e.name="Display name is required";
    else if(cleanName.length<2)e.name="Name must be at least 2 characters";
    else if(cleanName.length>50)e.name="Name must be under 50 characters";
    var cleanBio=bio.replace(/[<>`;\\]/g,"");
    if(cleanBio.length>200)e.bio="Bio must be under 200 characters";
    setErrors(e);return Object.keys(e).length===0;
  };

  const handleSave=()=>{
    if(!validate())return;
    setSaving(true);
    setTimeout(()=>{setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2500);},1200);
  };

  const Field=({icon:I,label,value,onChange,error,placeholder,disabled,multiline,maxLen,name:fName})=>(
    <div style={{marginBottom:16}}>
      <label style={{fontSize:12,fontWeight:600,color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)",marginBottom:6,display:"block",paddingLeft:4}}>{label}</label>
      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:multiline?"12px 14px":"0 14px",borderRadius:14,background:isLight?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.03)",border:`1px solid ${error?"rgba(239,68,68,0.3)":focused===fName?"rgba(139,92,246,0.3)":isLight?"rgba(139,92,246,0.15)":"rgba(255,255,255,0.06)"}`,transition:"all 0.2s",boxShadow:focused===fName?"0 0 0 3px rgba(139,92,246,0.08)":"none"}}>
        {!multiline&&<div style={{display:"flex",alignItems:"center",height:46}}><I size={16} color={error?"rgba(239,68,68,0.7)":(isLight?"#6D28D9":"#C4B5FD")} strokeWidth={2}/></div>}
        {multiline?(
          <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
            onFocus={()=>setFocused(fName)} onBlur={()=>setFocused(null)}
            rows={3} style={{flex:1,background:"none",border:"none",outline:"none",color:disabled?(isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"):(isLight?"#1a1535":"#fff"),fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.5}}/>
        ):(
          <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
            onFocus={()=>setFocused(fName)} onBlur={()=>setFocused(null)}
            style={{flex:1,height:46,background:"none",border:"none",outline:"none",color:disabled?(isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"):(isLight?"#1a1535":"#fff"),fontSize:14,fontFamily:"inherit"}}/>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",paddingLeft:4,marginTop:4}}>
        {error?<span style={{fontSize:12,color:"rgba(239,68,68,0.8)"}}>{error}</span>:<span/>}
        {maxLen&&<span style={{fontSize:12,color:value.length>maxLen?"rgba(239,68,68,0.8)":isLight?"rgba(26,21,53,0.45)":"rgba(255,255,255,0.4)"}}>{value.length}/{maxLen}</span>}
      </div>
    </div>
  );

  return(
    <div style={{width:"100%",height:"100dvh",overflow:"hidden",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",position:"relative"}}>

      {/* APPBAR */}
      <header style={{position:"relative",zIndex:100,height:64,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",background:isLight?"rgba(255,255,255,0.85)":"rgba(255,255,255,0.03)",backdropFilter:"blur(40px) saturate(1.4)",WebkitBackdropFilter:"blur(40px) saturate(1.4)",borderBottom:isLight?"1px solid rgba(139,92,246,0.1)":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="dp-ib" aria-label="Go back" onClick={()=>navigate(-1)}><ArrowLeft size={20} strokeWidth={2}/></button>
          <span style={{fontSize:17,fontWeight:700,color:isLight?"#1a1535":"#fff",letterSpacing:"-0.3px"}}>Edit Profile</span>
        </div>
        {hasChanges&&!saved&&<span style={{fontSize:12,color:isLight?"#B45309":"#FCD34D",fontWeight:500}}>Unsaved changes</span>}
        {saved&&<span style={{fontSize:12,color:isLight?"#059669":"#5DE5A8",fontWeight:600,display:"flex",alignItems:"center",gap:4}}><Check size={14} strokeWidth={2.5}/>Saved!</span>}
      </header>

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
                ):(
                  <span style={{fontSize:42,fontWeight:700,color:isLight?"#6D28D9":"#C4B5FD"}}>{USER.initial}</span>
                )}
              </div>
              {/* Camera button */}
              <button aria-label="Change profile photo" onClick={()=>setShowPicker(true)} style={{position:"absolute",bottom:0,right:0,width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#8B5CF6,#6D28D9)",border:isLight?"3px solid #f5f3ff":"3px solid #0c081a",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 12px rgba(139,92,246,0.4)",transition:"all 0.2s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
                onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                <Camera size={16} strokeWidth={2.5}/>
              </button>
            </div>
            <div style={{marginTop:12,fontSize:12,color:isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.5)"}}>Tap the camera to change your photo</div>
          </div>

          {/* ── Form ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"100ms"}}>
            <div className="dp-g" style={{padding:20}}>
              <Field icon={User} label="Display Name" name="name" value={name} onChange={setName} error={errors.name} placeholder="Your name"/>
              <Field icon={Mail} label="Email" name="email" value={USER.email} onChange={()=>{}} disabled placeholder="" />
              <Field icon={Clock} label="Timezone" name="tz" value={timezone} onChange={setTimezone} placeholder="e.g. America/New_York"/>
              <Field icon={FileText} label="Bio" name="bio" value={bio} onChange={setBio} placeholder="Tell others about yourself..." multiline maxLen={200}/>
            </div>
          </div>

          {/* ── Save Button ── */}
          <div className={`dp-a ${mounted?"dp-s":""}`} style={{animationDelay:"200ms"}}>
            <button onClick={handleSave} disabled={saving||!hasChanges} style={{
              width:"100%",marginTop:24,padding:"15px 0",borderRadius:16,
              border:hasChanges&&!saving?"none":(isLight?"1px solid rgba(139,92,246,0.2)":"1px solid rgba(255,255,255,0.1)"),
              background:hasChanges&&!saving?"linear-gradient(135deg,#8B5CF6,#6D28D9)":(isLight?"rgba(139,92,246,0.18)":"rgba(255,255,255,0.08)"),
              color:hasChanges&&!saving?"#fff":(isLight?"rgba(26,21,53,0.55)":"rgba(255,255,255,0.4)"),
              fontSize:15,fontWeight:600,cursor:hasChanges&&!saving?"pointer":"not-allowed",
              fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              boxShadow:hasChanges&&!saving?"0 4px 20px rgba(139,92,246,0.3)":"none",
              transition:"all 0.3s cubic-bezier(0.16,1,0.3,1)",
            }}
              onMouseEnter={e=>{if(hasChanges&&!saving)e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{if(hasChanges&&!saving)e.currentTarget.style.transform="translateY(0)";}}>
              {saving?(
                <><Loader size={18} strokeWidth={2} className="dp-spin"/>Saving...</>
              ):saved?(
                <><Check size={18} strokeWidth={2.5}/>Saved!</>
              ):(
                <><Check size={18} strokeWidth={2}/>Save Changes</>
              )}
            </button>
          </div>

        </div>
      </main>

      {/* ═══ IMAGE PICKER BOTTOM SHEET ═══ */}
      {showPicker&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={()=>setShowPicker(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}/>
          <div style={{position:"relative",width:"100%",maxWidth:420,background:isLight?"rgba(255,255,255,0.97)":"rgba(12,8,26,0.97)",backdropFilter:"blur(40px)",WebkitBackdropFilter:"blur(40px)",borderRadius:"22px 22px 0 0",border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",borderBottom:"none",animation:"dpSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)",padding:"16px 0 24px"}}>
            {/* Handle */}
            <div style={{width:40,height:4,borderRadius:2,background:isLight?"rgba(26,21,53,0.15)":"rgba(255,255,255,0.15)",margin:"0 auto 16px"}}/>
            <div style={{fontSize:16,fontWeight:600,color:isLight?"#1a1535":"#fff",textAlign:"center",marginBottom:16}}>Change Profile Photo</div>
            
            {[
              {Icon:Camera,label:"Take Photo",color:"#C4B5FD",action:()=>{setShowPicker(false);}},
              {Icon:Image,label:"Choose from Gallery",color:"#5DE5A8",action:()=>{fileRef.current?.click();}},
            ].map(({Icon:I,label,color,action},i)=>(
              <button key={i} onClick={action} style={{width:"100%",padding:"14px 20px",border:"none",background:"transparent",display:"flex",alignItems:"center",gap:14,cursor:"pointer",transition:"all 0.15s",fontFamily:"inherit"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:40,height:40,borderRadius:12,background:`${color}12`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <I size={18} color={isLight?(color==="#C4B5FD"?"#6D28D9":color==="#5DE5A8"?"#059669":color):color} strokeWidth={2}/>
                </div>
                <span style={{fontSize:15,fontWeight:500,color:isLight?"#1a1535":"#fff"}}>{label}</span>
              </button>
            ))}

            {avatarPreview&&(
              <button onClick={()=>{setAvatarPreview(null);setShowPicker(false);}} style={{width:"100%",padding:"14px 20px",border:"none",background:"transparent",display:"flex",alignItems:"center",gap:14,cursor:"pointer",fontFamily:"inherit",marginTop:4}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.04)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:40,height:40,borderRadius:12,background:"rgba(239,68,68,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <X size={18} color="rgba(239,68,68,0.8)" strokeWidth={2}/>
                </div>
                <span style={{fontSize:15,fontWeight:500,color:"rgba(239,68,68,0.8)"}}>Remove Photo</span>
              </button>
            )}

            <button onClick={()=>setShowPicker(false)} style={{width:"calc(100% - 32px)",margin:"12px 16px 0",padding:"12px",borderRadius:14,border:isLight?"1px solid rgba(139,92,246,0.15)":"1px solid rgba(255,255,255,0.08)",background:isLight?"rgba(139,92,246,0.05)":"rgba(255,255,255,0.04)",color:isLight?"rgba(26,21,53,0.72)":"rgba(255,255,255,0.85)",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFileSelect}/>

      {/* ═══ SUCCESS TOAST ═══ */}
      <div style={{position:"fixed",top:80,left:"50%",transform:`translateX(-50%) translateY(${saved?0:-80}px)`,opacity:saved?1:0,transition:"all 0.4s cubic-bezier(0.16,1,0.3,1)",zIndex:400,padding:"10px 20px",borderRadius:14,background:"rgba(93,229,168,0.12)",border:"1px solid rgba(93,229,168,0.2)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",display:"flex",alignItems:"center",gap:8,pointerEvents:"none"}}>
        <Check size={16} color={isLight?"#059669":"#5DE5A8"} strokeWidth={2.5}/>
        <span style={{fontSize:14,fontWeight:600,color:isLight?"#059669":"#5DE5A8"}}>Profile updated successfully!</span>
      </div>

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
