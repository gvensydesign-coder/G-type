/* Stage 5A: starter for the compressed JS bundles. Reads <script type="text/plain" id="zc|zu"> (base91 of raw deflate), inflates synchronously
   and runs the text as an ordinary inline <script> (so top-level const/let/function stay global and DOMContentLoaded still comes after).
   Synchronous on purpose: DecompressionStream is async and would have to hold back the parse-time scripts that the UI registers events in. */
(function(){
  var A=[],i=0,c;for(c=33;c<127;c++)if(c!=39&&c!=60&&c!=92)A[c]=i++;
  function unb(s){var n=s.length,o=new Uint8Array(n),k=0,v=-1,b=0,m=0,d,x;
    for(i=0;i<n;i++){d=A[s.charCodeAt(i)];if(d===undefined)continue;
      if(v<0)v=d;else{v+=d*91;b|=v<<m;m+=(v&8191)>88?13:14;do{o[k++]=b&255;b>>=8;m-=8}while(m>7);v=-1}}
    if(v>-1)o[k++]=(b|v<<m)&255;
    return o.subarray(0,k);}
  var LB=[3],LE=[],DB=[1],DE=[];
  for(i=0;i<29;i++){LE[i]=i<4||i>27?0:(i-4)>>2;LB[i+1]=LB[i]+(1<<LE[i]);}
  LB[28]=258;
  for(i=0;i<30;i++){DE[i]=i<2?0:(i-2)>>1;DB[i+1]=DB[i]+(1<<DE[i]);}
  var CO=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
  function mk(L,N){var m=0,i,l,s,t,cn=new Uint16Array(16),nx=new Uint16Array(16),q=0,r,j;
    for(i=0;i<N;i++){if(L[i]>m)m=L[i];cn[L[i]]++;}
    cn[0]=0;for(l=1;l<16;l++){q=(q+cn[l-1])<<1;nx[l]=q;}
    t=new Int32Array(1<<m);
    for(s=0;s<N;s++){l=L[s];if(!l)continue;q=nx[l]++;r=0;for(i=0;i<l;i++){r=r<<1|q&1;q>>=1;}
      for(j=r;j<1<<m;j+=1<<l)t[j]=l<<16|s;}
    return [t,m];}
  function inflate(a,out){
    var p=0,b=0,n=0,o=0,last,t,i,L,hl,hd,s,l,d,l2;
    function bit(k){while(n<k){b|=a[p++]<<n;n+=8;}var v=b&((1<<k)-1);b>>>=k;n-=k;return v;}
    function sym(h){while(n<h[1]){b|=a[p++]<<n;n+=8;}var e=h[0][b&((1<<h[1])-1)];b>>>=e>>16;n-=e>>16;return e&65535;}
    do{last=bit(1);t=bit(2);
      if(!t){p-=n>>3;b=0;n=0;l=a[p]|a[p+1]<<8;p+=4;while(l--)out[o++]=a[p++];continue;}
      if(t==1){L=[];for(i=0;i<288;i++)L[i]=i<144?8:i<256?9:i<280?7:8;hl=mk(L,288);L=[];for(i=0;i<30;i++)L[i]=5;hd=mk(L,30);}
      else{var nl=bit(5)+257,nd=bit(5)+1,nc=bit(4)+4,cl=[];
        for(i=0;i<19;i++)cl[CO[i]]=i<nc?bit(3):0;
        var hc=mk(cl,19);L=[];
        while(L.length<nl+nd){s=sym(hc);
          if(s<16)L.push(s);
          else{l=s==16?3+bit(2):s==17?3+bit(3):11+bit(7);d=s==16?L[L.length-1]:0;while(l--)L.push(d);}}
        hl=mk(L.slice(0,nl),nl);hd=mk(L.slice(nl),nd);}
      var lt=hl[0],lm=(1<<hl[1])-1,dt=hd[0],dm=(1<<hd[1])-1,B=b,N=n,P=p,O=o,e;
      for(;;){
        while(N<15){B|=a[P++]<<N;N+=8;}
        e=lt[B&lm];B>>>=e>>16;N-=e>>16;s=e&65535;
        if(s<256){out[O++]=s;continue;}
        if(s==256)break;
        s-=257;l=LE[s];while(N<l+15){B|=a[P++]<<N;N+=8;}
        l=LB[s]+(B&((1<<l)-1));B>>>=LE[s];N-=LE[s];
        e=dt[B&dm];B>>>=e>>16;N-=e>>16;d=e&65535;
        l2=DE[d];while(N<l2){B|=a[P++]<<N;N+=8;}
        d=DB[d]+(B&((1<<l2)-1));B>>>=l2;N-=l2;
        while(l--){out[O]=out[O-d];O++;}}
      b=B;n=N;p=P;o=O;
    }while(!last);
    return out;}
  function run(id){var e=document.getElementById(id),s=document.createElement('script');
    if(e.hasAttribute('data-raw'))s.text=e.textContent;   /* debug / --nocompress build: the block holds the plain source */
    else s.text=new TextDecoder().decode(inflate(unb(e.textContent),new Uint8Array(+e.getAttribute('data-n'))));document.head.appendChild(s);s.remove();e.remove();}
  window.__zrun=run;
})();
