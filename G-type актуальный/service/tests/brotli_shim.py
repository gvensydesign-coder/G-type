"""Fallback 'brotli' module over the system libbrotlidec/libbrotlienc (ctypes) for machines where `pip install brotli` is impossible (no network).
Imported first by the W96 format checks; does nothing when the real module exists."""
import sys
try:
    import brotli  # noqa: F401
except ImportError:
    import ctypes, ctypes.util, types
    _d = ctypes.CDLL(ctypes.util.find_library('brotlidec') or 'libbrotlidec.so.1')
    _e = ctypes.CDLL(ctypes.util.find_library('brotlienc') or 'libbrotlienc.so.1')
    m = types.ModuleType('brotli')

    def decompress(data):
        data = bytes(data)
        size = ctypes.c_size_t(max(len(data) * 20, 1 << 20))
        while True:
            buf = ctypes.create_string_buffer(size.value); n = ctypes.c_size_t(size.value)
            r = _d.BrotliDecoderDecompress(ctypes.c_size_t(len(data)), data, ctypes.byref(n), buf)
            if r == 1:
                return buf.raw[:n.value]
            if r == 0:
                raise m.error('brotli decode failed')
            size = ctypes.c_size_t(size.value * 4)

    def compress(data, mode=0, quality=11, lgwin=22, lgblock=0):
        data = bytes(data)
        cap = _e.BrotliEncoderMaxCompressedSize(ctypes.c_size_t(len(data)))
        buf = ctypes.create_string_buffer(cap); n = ctypes.c_size_t(cap)
        ok = _e.BrotliEncoderCompress(quality, lgwin, mode, ctypes.c_size_t(len(data)), data, ctypes.byref(n), buf)
        if not ok:
            raise m.error('brotli encode failed')
        return buf.raw[:n.value]
    m.error = type('error', (Exception,), {}); m.decompress = decompress; m.compress = compress; m.__version__ = 'shim'
    sys.modules['brotli'] = m
