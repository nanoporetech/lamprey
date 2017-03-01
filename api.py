from __future__ import print_function
import sys, os, zerorpc
sys.path.append(os.path.dirname(os.path.realpath(__file__)) + "/externals/nanonet")
from nanonet.nanonetcall import process_read as process_read

class RunnerApi(object):
    def process_read(self, filename, modelname):
        """basecall a given file (filepath) with a given model (filepath)"""
        try:
            [(fname, (seq, qual), score, len_features), (network_time, decode_time)] = process_read(modelname, filename, section="template")
            if fname is not None:
                fastq = "@{}\n{}\n+\n{}\n".format(fname, seq, qual)
            return [fastq]
        except Exception as e:
            return [None, str(e)]
    def echo(self, text):
        """echo any text"""
        return text

def parse_port():
    return "4242"

def main():
    addr = 'tcp://127.0.0.1:' + parse_port()
    s = zerorpc.Server(RunnerApi())
    s.bind(addr)
    print('start running on {}'.format(addr))
    s.run()

if __name__ == '__main__':
    main()
