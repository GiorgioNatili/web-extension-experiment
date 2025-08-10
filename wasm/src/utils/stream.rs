pub struct FileStream {
    pub chunk_size: usize,
    pub buffer: Vec<u8>,
    pub position: usize,
}

impl FileStream {
    pub fn new(chunk_size: usize) -> Self {
        FileStream {
            chunk_size,
            buffer: Vec::new(),
            position: 0,
        }
    }
    
    pub fn process_chunk(&mut self, data: &[u8]) -> Vec<u8> {
        self.buffer.extend_from_slice(data);
        
        if self.buffer.len() >= self.chunk_size {
            let chunk = self.buffer[..self.chunk_size].to_vec();
            self.buffer.drain(..self.chunk_size);
            chunk
        } else {
            Vec::new()
        }
    }
}
