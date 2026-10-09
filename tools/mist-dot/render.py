# CPU mirror of the mist_dot fragment shader, to judge the look off-device.
import sys, glob, numpy as np
from PIL import Image
N=32; PX=int(sys.argv[2]) if len(sys.argv)>2 else 192
def hash2(x,y):
    x=np.mod(x*123.34,1.0); y=np.mod(y*456.21,1.0)
    d=x*(x+45.32)+y*(y+45.32); x=x+d; y=y+d
    return np.mod(x*y,1.0)
def noise(x,y):
    ix=np.floor(x); iy=np.floor(y); fx=x-ix; fy=y-iy
    ux=fx*fx*(3-2*fx); uy=fy*fy*(3-2*fy)
    a=hash2(ix,iy); b=hash2(ix+1,iy); c=hash2(ix,iy+1); d=hash2(ix+1,iy+1)
    return (a*(1-ux)+b*ux)*(1-uy)+(c*(1-ux)+d*ux)*uy
def fbm(x,y):
    v=0; a=0.5
    for _ in range(4):
        v=v+a*noise(x,y); x,y=1.6*x+1.2*y, -1.2*x+1.6*y; a*=0.5
    return v/0.9375
def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
def tex(D,x,y):  # bilinear, cell centres at +0.5, clamp
    fx=x-0.5; fy=y-0.5; i=np.floor(fx).astype(int); j=np.floor(fy).astype(int); tx=fx-i; ty=fy-j
    g=lambda i,j: D[np.clip(j,0,N-1),np.clip(i,0,N-1)]
    return (g(i,j)*(1-tx)+g(i+1,j)*tx)*(1-ty)+(g(i,j+1)*(1-tx)+g(i+1,j+1)*tx)*ty
def mix(a,b,t): return a+(b-a)*t[...,None]
C0=np.array([0.027,0.039,0.075])   # the jar's dark
C1=np.array([0.110,0.200,0.430])   # deep mist
C2=np.array([0.443,0.576,0.847])   # the frosted moon, #7193D8
C3=np.array([0.800,0.855,0.965])   # its pale heart
def render(D,T):
    yy,xx=np.mgrid[0:PX,0:PX]+0.5
    px=xx/PX*2-1; py=yy/PX*2-1     # y down, like the grid
    r=np.sqrt(px*px+py*py); aa=2.0/(PX*0.5)
    mask=1-smooth(1-aa,1,r)
    gx=(px*0.5+0.5)*N; gy=(py*0.5+0.5)*N
    # Wisps: the mist sampled through a slowly drifting warp, then blurred with 9 taps.
    wx=fbm(gx*0.18+T*0.20, gy*0.18)-0.5; wy=fbm(gx*0.18+5.2, gy*0.18-T*0.17)-0.5
    sx=gx+wx*3.2; sy=gy+wy*3.2
    m=0; R=2.4
    for ox,oy,w in [(0,0,.2)]+[(np.cos(a)*R,np.sin(a)*R,.1) for a in np.arange(8)*np.pi/4]:
        m=m+w*tex(D,sx+ox,sy+oy)
    grain=fbm(gx*0.45-T*0.3, gy*0.45+T*0.12)
    m=m*(0.8+0.4*grain)
    col=mix(C0,C1,smooth(0.0,0.45,m))
    col=mix(col,C2,smooth(0.3,0.95,m)*0.9)
    col=mix(col,C3,smooth(0.85,1.25,m)*0.5)
    # Glass: a faint rim and a small highlight, top left.
    z=np.sqrt(np.clip(1-r*r,0,1))
    col=col*(0.82+0.18*z)[...,None]
    col=col+(0.05*(1-z)**3)[...,None]
    # A thin rim of light on the upper left, like the orb's glass edge.
    edge=smooth(0.80,0.95,r)*(1-smooth(0.95,1.0,r))
    col=col+(0.09*edge*smooth(-0.2,0.9,-py*0.8-px*0.5))[...,None]
    col=np.clip(col,0,1)*mask[...,None]
    return col
files=sorted(glob.glob(sys.argv[1]+'/*.f32'))
tiles=[]
for i,f in enumerate(files):
    D=np.fromfile(f,dtype=np.float32).reshape(N,N)
    tiles.append(render(D,i*0.25))
cols=8; rows=(len(tiles)+cols-1)//cols; P=PX+8
out=np.full((rows*P,cols*P,3),0.0)
for i,t in enumerate(tiles):
    r,c=divmod(i,cols); out[r*P+4:r*P+4+PX,c*P+4:c*P+4+PX]=t
Image.fromarray((out*255).astype(np.uint8)).save(sys.argv[3] if len(sys.argv)>3 else 'look.png')
